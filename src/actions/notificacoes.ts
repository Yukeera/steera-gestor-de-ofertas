"use server";

import { revalidatePath } from "next/cache";

import { exigirMembro } from "@/lib/auth/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";

export type Resultado = { ok: true } | { ok: false; erro: string };

/**
 * Marca todas as notificações da pessoa como lidas.
 *
 * O RLS já limita o update às dela; o `eq` por `membro_id` é redundância
 * intencional, para a intenção ficar legível no código e não só na policy.
 */
export async function marcarTodasLidas(): Promise<Resultado> {
  const membro = await exigirMembro();
  const supabase = await criarClienteServidor();

  const { error } = await supabase
    .from("notificacoes")
    .update({ lida: true })
    .eq("membro_id", membro.id)
    .eq("lida", false);

  if (error) return { ok: false, erro: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function marcarLida(id: string): Promise<Resultado> {
  await exigirMembro();
  const supabase = await criarClienteServidor();

  const { error } = await supabase
    .from("notificacoes")
    .update({ lida: true })
    .eq("id", id);

  if (error) return { ok: false, erro: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}
