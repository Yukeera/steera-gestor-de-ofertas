"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { exigirMestreOuChefe } from "@/lib/auth/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { FUNCOES } from "@/lib/dominio/tipos";

export type Resultado = { ok: true; id?: string } | { ok: false; erro: string };

const esquemaRoteiro = z.object({
  nome: z.string().trim().min(3, "Dê um nome de ao menos 3 letras ao roteiro."),
  descricao: z.string().trim().max(300).optional().or(z.literal("")),
});

const esquemaEtapas = z
  .array(
    z.object({
      titulo: z.string().trim().min(3, "Toda etapa precisa de um título."),
      descricao: z.string().trim().max(500).optional().default(""),
      funcoes: z.array(z.enum(FUNCOES)).default([]),
    }),
  )
  .min(1, "Um roteiro sem etapa nenhuma não monta oferta.");

export type EtapaDoRoteiro = z.input<typeof esquemaEtapas>[number];

export async function criarRoteiro(formData: FormData): Promise<Resultado> {
  const membro = await exigirMestreOuChefe();

  const analise = esquemaRoteiro.safeParse({
    nome: formData.get("nome"),
    descricao: formData.get("descricao") ?? "",
  });

  if (!analise.success) {
    return { ok: false, erro: analise.error.issues[0].message };
  }

  const supabase = await criarClienteServidor();

  const { data, error } = await supabase
    .from("roteiros")
    .insert({
      nome: analise.data.nome,
      descricao: analise.data.descricao || null,
      criado_por: membro.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, erro: error?.message ?? "Não foi possível criar." };
  }

  // Um roteiro nasce com uma etapa em branco: uma lista vazia não dá pista
  // nenhuma do que fazer em seguida.
  await supabase.rpc("salvar_roteiro_etapas", {
    p_roteiro_id: data.id,
    p_etapas: [{ titulo: "Primeira etapa", descricao: "", funcoes: [] }],
  });

  revalidatePath("/configuracoes/roteiros");
  return { ok: true, id: data.id };
}

export async function atualizarRoteiro(
  roteiroId: string,
  formData: FormData,
): Promise<Resultado> {
  await exigirMestreOuChefe();

  const analise = esquemaRoteiro.safeParse({
    nome: formData.get("nome"),
    descricao: formData.get("descricao") ?? "",
  });

  if (!analise.success) {
    return { ok: false, erro: analise.error.issues[0].message };
  }

  const supabase = await criarClienteServidor();

  const { error } = await supabase
    .from("roteiros")
    .update({
      nome: analise.data.nome,
      descricao: analise.data.descricao || null,
    })
    .eq("id", roteiroId);

  if (error) return { ok: false, erro: error.message };

  revalidatePath("/configuracoes/roteiros");
  revalidatePath(`/configuracoes/roteiros/${roteiroId}`);
  return { ok: true };
}

/**
 * RF-03.2 — substitui a lista de etapas inteira.
 *
 * A ordem é a posição no array, e o banco resolve tudo numa transação só
 * (ver a função `salvar_roteiro_etapas`). Mandar a lista completa em vez de
 * um diff evita reconciliar estado entre tela e banco por um ganho que, num
 * roteiro de oito linhas, não existe.
 */
export async function salvarEtapas(
  roteiroId: string,
  etapas: EtapaDoRoteiro[],
): Promise<Resultado> {
  await exigirMestreOuChefe();

  const analise = esquemaEtapas.safeParse(etapas);
  if (!analise.success) {
    return { ok: false, erro: analise.error.issues[0].message };
  }

  const supabase = await criarClienteServidor();

  const { error } = await supabase.rpc("salvar_roteiro_etapas", {
    p_roteiro_id: roteiroId,
    p_etapas: analise.data,
  });

  if (error) return { ok: false, erro: error.message };

  revalidatePath("/configuracoes/roteiros");
  revalidatePath(`/configuracoes/roteiros/${roteiroId}`);
  return { ok: true };
}

/** RF-10.2 — define qual roteiro vem pré-selecionado ao montar uma Rodada. */
export async function definirPadrao(roteiroId: string): Promise<Resultado> {
  await exigirMestreOuChefe();

  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("definir_roteiro_padrao", {
    p_roteiro_id: roteiroId,
  });

  if (error) return { ok: false, erro: error.message };

  revalidatePath("/configuracoes/roteiros");
  return { ok: true };
}

/** RF-03.5 — roteiro sai de circulação sem sumir do histórico. */
export async function alternarArquivado(
  roteiroId: string,
  arquivado: boolean,
): Promise<Resultado> {
  await exigirMestreOuChefe();

  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("arquivar_roteiro", {
    p_roteiro_id: roteiroId,
    p_arquivado: arquivado,
  });

  if (error) return { ok: false, erro: error.message };

  revalidatePath("/configuracoes/roteiros");
  return { ok: true };
}
