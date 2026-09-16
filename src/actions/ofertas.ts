"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { exigirMembro, exigirMestreOuChefe } from "@/lib/auth/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { normalizarWhatsapp } from "@/lib/whatsapp";

export type Resultado = { ok: true } | { ok: false; erro: string };

const esquemaValidacao = z.object({
  validada: z.boolean(),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data da validação."),
  observacao: z.string().trim().max(1000).optional().default(""),
});

export type EntradaValidacao = z.input<typeof esquemaValidacao>;

function revalidar(ofertaId: string) {
  revalidatePath("/ofertas");
  revalidatePath(`/ofertas/${ofertaId}`);
  revalidatePath("/painel");
  revalidatePath("/calendario");
  revalidatePath("/rodadas", "layout");
}

/** RF-08.4 — julga a oferta depois do teste de mercado. */
export async function validarOferta(
  ofertaId: string,
  entrada: EntradaValidacao,
): Promise<Resultado> {
  await exigirMestreOuChefe();

  const analise = esquemaValidacao.safeParse(entrada);
  if (!analise.success) {
    return { ok: false, erro: analise.error.issues[0].message };
  }

  const supabase = await criarClienteServidor();

  const { error } = await supabase.rpc("validar_oferta", {
    p_oferta_id: ofertaId,
    p_validada: analise.data.validada,
    p_data: analise.data.data,
    p_observacao: analise.data.observacao,
  });

  if (error) return { ok: false, erro: error.message };

  revalidar(ofertaId);
  return { ok: true };
}

/** RF-08.4 — desfaz o julgamento, devolvendo a oferta para Concluída. */
export async function desfazerValidacao(
  ofertaId: string,
): Promise<Resultado> {
  await exigirMestreOuChefe();

  const supabase = await criarClienteServidor();

  const { error } = await supabase.rpc("desfazer_validacao", {
    p_oferta_id: ofertaId,
  });

  if (error) return { ok: false, erro: error.message };

  revalidar(ofertaId);
  return { ok: true };
}

/**
 * Define o WhatsApp que leva ao funil, a qualquer altura da vida da oferta.
 *
 * Passa por `definir_whatsapp_funil` em vez de um `update` direto porque a
 * policy de `ofertas` libera a linha inteira só para Chefe e Mestre — e este
 * campo precisa ser de qualquer membro, já que quem monta o funil é quem sabe
 * o número. A função no banco toca só esta coluna.
 */
export async function definirWhatsappFunil(
  ofertaId: string,
  bruto: string,
): Promise<Resultado> {
  await exigirMembro();

  // Normaliza aqui e no banco. Aqui para dar mensagem boa; lá porque a action
  // não é a única porta possível para a coluna.
  const analise = normalizarWhatsapp(bruto);
  if (analise.erro) return { ok: false, erro: analise.erro };

  const supabase = await criarClienteServidor();

  const { error } = await supabase.rpc("definir_whatsapp_funil", {
    p_oferta_id: ofertaId,
    p_numero: analise.numero,
  });

  if (error) return { ok: false, erro: error.message };

  revalidar(ofertaId);
  revalidatePath("/peneira");
  return { ok: true };
}

/** Corrige os dados de origem depois que a oferta já saiu da Peneira. */
export async function atualizarOrigem(
  ofertaId: string,
  formData: FormData,
): Promise<Resultado> {
  await exigirMestreOuChefe();

  const analise = z
    .object({
      nome: z.string().trim().min(3, "O nome precisa ter ao menos 3 letras."),
      descricao: z.string().trim().min(10, "Descreva o que o produto oferece."),
      anuncianteReferencia: z.string().trim().max(200).optional().default(""),
      urlReferencia: z
        .string()
        .trim()
        .url("O link precisa ser uma URL completa.")
        .optional()
        .or(z.literal("")),
      nicho: z.string().trim().max(80).optional().default(""),
    })
    .safeParse({
      nome: formData.get("nome"),
      descricao: formData.get("descricao"),
      anuncianteReferencia: formData.get("anunciante_referencia") ?? "",
      urlReferencia: formData.get("url_referencia") ?? "",
      nicho: formData.get("nicho") ?? "",
    });

  if (!analise.success) {
    return { ok: false, erro: analise.error.issues[0].message };
  }

  const d = analise.data;
  const supabase = await criarClienteServidor();

  const { data, error } = await supabase
    .from("ofertas")
    .update({
      nome: d.nome,
      descricao: d.descricao,
      anunciante_referencia: d.anuncianteReferencia || null,
      url_referencia: d.urlReferencia || null,
      nicho: d.nicho || null,
    })
    .eq("id", ofertaId)
    .select("id");

  if (error) return { ok: false, erro: error.message };
  if (!data || data.length === 0) {
    return { ok: false, erro: "Você não tem permissão para editar esta oferta." };
  }

  revalidar(ofertaId);
  return { ok: true };
}
