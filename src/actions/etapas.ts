"use server";

import { revalidatePath } from "next/cache";

import {
  ehMestreOuChefe,
  exigirMembro,
  exigirMestreOuChefe,
} from "@/lib/auth/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";

export type Resultado = { ok: true } | { ok: false; erro: string };

function revalidarTelas(ofertaId: string) {
  revalidatePath("/");
  revalidatePath(`/ofertas/${ofertaId}`);
  revalidatePath("/rodadas", "layout");
}

/**
 * RF-06.4 — marca ou desmarca uma etapa.
 *
 * Quem concluiu e quando são carimbados por trigger no banco, não enviados
 * daqui: o cliente não tem como ser a fonte da verdade sobre isso.
 *
 * A transição da oferta para CONCLUIDA quando a última etapa fecha também é do
 * banco (RN-08). Aqui não há nenhuma lógica de status.
 */
export async function alternarEtapa(
  etapaId: string,
  ofertaId: string,
  concluida: boolean,
): Promise<Resultado> {
  await exigirMembro();

  const supabase = await criarClienteServidor();

  // O `select` não é decoração: sob RLS, um update que a policy barra não
  // devolve erro — devolve zero linhas. Sem isso, negar permissão apareceria
  // na tela como sucesso.
  const { data, error } = await supabase
    .from("oferta_etapas")
    .update({ concluida })
    .eq("id", etapaId)
    .select("id");

  if (error) {
    // A trigger de oferta já validada devolve check_violation com a mensagem
    // pronta para a pessoa ler.
    return { ok: false, erro: error.message };
  }

  if (!data || data.length === 0) {
    return {
      ok: false,
      erro: "Você só pode marcar etapas em que é um dos responsáveis.",
    };
  }

  revalidarTelas(ofertaId);
  return { ok: true };
}

/**
 * RF-06.3 — atribui um membro a uma etapa.
 *
 * Acumula em vez de substituir: uma etapa pode ter mais de um dono (RN-06), e
 * a etapa 7 do roteiro padrão é exatamente esse caso.
 */
export async function delegarEtapa(
  etapaId: string,
  ofertaId: string,
  membroId: string,
): Promise<Resultado> {
  await exigirMestreOuChefe();

  const supabase = await criarClienteServidor();

  const { error } = await supabase
    .from("oferta_etapa_responsaveis")
    .upsert(
      { oferta_etapa_id: etapaId, membro_id: membroId, origem: "DELEGADO" },
      { onConflict: "oferta_etapa_id,membro_id", ignoreDuplicates: true },
    );

  if (error) return { ok: false, erro: error.message };

  revalidarTelas(ofertaId);
  return { ok: true };
}

/** RF-06.3 — tira um responsável da etapa. */
export async function removerResponsavel(
  etapaId: string,
  ofertaId: string,
  membroId: string,
): Promise<Resultado> {
  await exigirMestreOuChefe();

  const supabase = await criarClienteServidor();

  const { error } = await supabase
    .from("oferta_etapa_responsaveis")
    .delete()
    .eq("oferta_etapa_id", etapaId)
    .eq("membro_id", membroId);

  if (error) return { ok: false, erro: error.message };

  revalidarTelas(ofertaId);
  return { ok: true };
}

/**
 * Troca o conjunto de responsáveis de uma vez.
 *
 * É o que o seletor por clique usa — a alternativa acessível ao arrastar, onde
 * a pessoa marca e desmarca vários antes de confirmar.
 */
export async function definirResponsaveis(
  etapaId: string,
  ofertaId: string,
  membroIds: string[],
): Promise<Resultado> {
  const membro = await exigirMembro();

  if (!ehMestreOuChefe(membro)) {
    return {
      ok: false,
      erro: "Só o Chefe e o Mestre da Esteira delegam etapas.",
    };
  }

  const supabase = await criarClienteServidor();

  const { error: erroRemocao } = await supabase
    .from("oferta_etapa_responsaveis")
    .delete()
    .eq("oferta_etapa_id", etapaId);

  if (erroRemocao) return { ok: false, erro: erroRemocao.message };

  if (membroIds.length > 0) {
    const { error } = await supabase.from("oferta_etapa_responsaveis").insert(
      membroIds.map((membro_id) => ({
        oferta_etapa_id: etapaId,
        membro_id,
        origem: "DELEGADO" as const,
      })),
    );

    if (error) return { ok: false, erro: error.message };
  }

  revalidarTelas(ofertaId);
  return { ok: true };
}
