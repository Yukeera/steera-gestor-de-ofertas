"use server";

import { revalidatePath } from "next/cache";

import { exigirMestreOuChefe } from "@/lib/auth/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";

export type Resultado =
  | { ok: true; data: string }
  | { ok: false; erro: string };

/**
 * RF-05.4 — move uma oferta para outro dia.
 *
 * `trocar` é decidido pela interface: ela já sabe o que está em cada dia e
 * pergunta antes. O banco recebe a decisão e a executa como transação — mas
 * recusa por conta própria se o dia foi ocupado nesse meio-tempo, porque duas
 * pessoas podem estar mexendo no calendário ao mesmo tempo.
 */
export async function remanejarOferta(
  ofertaId: string,
  novaData: string,
  trocar = false,
): Promise<Resultado> {
  await exigirMestreOuChefe();

  const supabase = await criarClienteServidor();

  const { data, error } = await supabase.rpc("remanejar_oferta", {
    p_oferta_id: ofertaId,
    p_nova_data: novaData,
    p_trocar: trocar,
  });

  if (error) return { ok: false, erro: error.message };

  revalidatePath("/calendario");
  revalidatePath("/");
  revalidatePath("/rodadas", "layout");

  return { ok: true, data: data as string };
}
