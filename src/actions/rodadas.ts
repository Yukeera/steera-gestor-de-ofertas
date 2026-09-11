"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { exigirMestreOuChefe } from "@/lib/auth/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";

export type Resultado = { ok: true; id?: string } | { ok: false; erro: string };

const esquemaRodada = z.object({
  nome: z.string().trim().min(2, "A Rodada precisa de um nome."),
  dataInicio: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Escolha a data de início."),
  observacoes: z.string().trim().max(500).optional().default(""),
  ofertas: z
    .array(
      z.object({
        oferta_id: z.string().uuid(),
        roteiro_id: z.string().uuid(),
      }),
    )
    .min(1, "Escolha ao menos uma oferta para a Rodada."),
});

export type EntradaRodada = z.input<typeof esquemaRodada>;

/**
 * RF-04.3 — cria a Rodada e escala as ofertas.
 *
 * Toda a operação acontece numa função do banco: mudar status, gravar data
 * prevista, copiar as etapas do roteiro e pré-preencher responsáveis são cinco
 * tabelas. Falhar no meio deixaria ofertas fora da Peneira e sem etapa nenhuma,
 * sem caminho de volta pela interface.
 */
export async function criarRodada(entrada: EntradaRodada): Promise<Resultado> {
  await exigirMestreOuChefe();

  const analise = esquemaRodada.safeParse(entrada);
  if (!analise.success) {
    return { ok: false, erro: analise.error.issues[0].message };
  }

  const { nome, dataInicio, observacoes, ofertas } = analise.data;
  const supabase = await criarClienteServidor();

  const { data, error } = await supabase.rpc("criar_rodada", {
    p_nome: nome,
    p_data_inicio: dataInicio,
    p_observacoes: observacoes,
    p_ofertas: ofertas,
  });

  if (error) return { ok: false, erro: error.message };

  revalidatePath("/rodadas");
  revalidatePath("/peneira");
  revalidatePath("/", "layout");
  return { ok: true, id: data as string };
}

/** RF-04.5 — acrescenta uma oferta a uma Rodada em andamento. */
export async function adicionarOferta(
  rodadaId: string,
  ofertaId: string,
  roteiroId: string,
): Promise<Resultado> {
  await exigirMestreOuChefe();

  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("adicionar_oferta_rodada", {
    p_rodada_id: rodadaId,
    p_oferta_id: ofertaId,
    p_roteiro_id: roteiroId,
  });

  if (error) return { ok: false, erro: error.message };

  revalidatePath(`/rodadas/${rodadaId}`);
  revalidatePath("/peneira");
  revalidatePath("/", "layout");
  return { ok: true };
}

/** RF-04.5 — devolve uma oferta para a Peneira. */
export async function removerOferta(
  rodadaId: string,
  ofertaId: string,
): Promise<Resultado> {
  await exigirMestreOuChefe();

  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("remover_oferta_rodada", {
    p_oferta_id: ofertaId,
  });

  if (error) return { ok: false, erro: error.message };

  revalidatePath(`/rodadas/${rodadaId}`);
  revalidatePath("/peneira");
  revalidatePath("/", "layout");
  return { ok: true };
}

/** RN-12 — cancela a Rodada e devolve tudo para a Peneira. */
export async function cancelarRodada(rodadaId: string): Promise<Resultado> {
  await exigirMestreOuChefe();

  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("cancelar_rodada", {
    p_rodada_id: rodadaId,
  });

  if (error) return { ok: false, erro: error.message };

  revalidatePath("/rodadas");
  revalidatePath("/peneira");
  revalidatePath("/", "layout");
  return { ok: true };
}
