"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { exigirMembro, exigirMestreOuChefe } from "@/lib/auth/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";

export type Resultado = { ok: true; id?: string } | { ok: false; erro: string };

const esquemaTarefa = z.object({
  titulo: z.string().trim().min(3, "Dê um título de ao menos 3 letras."),
  descricao: z.string().trim().max(1000).optional().default(""),
  prazo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Escolha o prazo."),
  prioridade: z.enum(["NORMAL", "ALTA"]),
  ofertaId: z.string().uuid().nullable().optional(),
  responsaveis: z
    .array(z.string().uuid())
    .min(1, "Escolha ao menos uma pessoa para a tarefa."),
});

export type EntradaTarefa = z.input<typeof esquemaTarefa>;

function revalidar() {
  revalidatePath("/");
  revalidatePath("/tarefas");
}

/** RF-07.1 e RF-07.2 — cria ou edita uma tarefa. */
export async function salvarTarefa(
  id: string | null,
  entrada: EntradaTarefa,
): Promise<Resultado> {
  await exigirMestreOuChefe();

  const analise = esquemaTarefa.safeParse(entrada);
  if (!analise.success) {
    return { ok: false, erro: analise.error.issues[0].message };
  }

  const d = analise.data;
  const supabase = await criarClienteServidor();

  const { data, error } = await supabase.rpc("salvar_tarefa", {
    p_id: id,
    p_titulo: d.titulo,
    p_descricao: d.descricao,
    p_prazo: d.prazo,
    p_prioridade: d.prioridade,
    p_oferta_id: d.ofertaId ?? null,
    p_responsaveis: d.responsaveis,
  });

  if (error) return { ok: false, erro: error.message };

  revalidar();
  return { ok: true, id: data as string };
}

/**
 * RF-07.4 — marca ou desmarca a conclusão.
 *
 * Aberta a qualquer responsável, não só a quem criou. Quem concluiu e quando
 * são carimbados por trigger, e um trigger separado impede que um funcionário
 * aproveite este caminho para reescrever título, prazo ou prioridade.
 */
export async function concluirTarefa(
  tarefaId: string,
  concluida: boolean,
): Promise<Resultado> {
  await exigirMembro();

  const supabase = await criarClienteServidor();

  // `select` obrigatório: sob RLS, update barrado não devolve erro — devolve
  // zero linhas. Sem isso, "não é sua tarefa" viraria sucesso na tela.
  const { data, error } = await supabase
    .from("tarefas")
    .update({ status: concluida ? "CONCLUIDA" : "ABERTA" })
    .eq("id", tarefaId)
    .select("id");

  if (error) return { ok: false, erro: error.message };

  if (!data || data.length === 0) {
    return {
      ok: false,
      erro: "Você só pode concluir tarefas designadas a você.",
    };
  }

  revalidar();
  return { ok: true };
}

/** RF-07.5 — cancela sem apagar, para o histórico não mentir. */
export async function cancelarTarefa(
  tarefaId: string,
  motivo: string,
): Promise<Resultado> {
  await exigirMestreOuChefe();

  const supabase = await criarClienteServidor();

  const { error } = await supabase
    .from("tarefas")
    .update({
      status: "CANCELADA",
      motivo_cancelamento: motivo.trim() || null,
    })
    .eq("id", tarefaId);

  if (error) return { ok: false, erro: error.message };

  revalidar();
  return { ok: true };
}

/** Traz de volta uma tarefa cancelada. */
export async function reabrirTarefa(tarefaId: string): Promise<Resultado> {
  await exigirMestreOuChefe();

  const supabase = await criarClienteServidor();

  const { error } = await supabase
    .from("tarefas")
    .update({ status: "ABERTA", motivo_cancelamento: null })
    .eq("id", tarefaId);

  if (error) return { ok: false, erro: error.message };

  revalidar();
  return { ok: true };
}
