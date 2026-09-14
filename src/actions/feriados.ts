"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { exigirChefe } from "@/lib/auth/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";

export type Resultado = { ok: true } | { ok: false; erro: string };

const esquema = z.object({
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Escolha a data."),
  descricao: z
    .string()
    .trim()
    .min(2, "Dê um nome ao feriado, para a equipe saber do que se trata."),
});

function revalidar() {
  revalidatePath("/configuracoes/feriados");
  // O calendário e a montagem de Rodadas dependem da lista de dias úteis.
  revalidatePath("/calendario");
  revalidatePath("/rodadas/nova");
}

export async function adicionarFeriado(
  formData: FormData,
): Promise<Resultado> {
  await exigirChefe();

  const analise = esquema.safeParse({
    data: formData.get("data"),
    descricao: formData.get("descricao"),
  });

  if (!analise.success) {
    return { ok: false, erro: analise.error.issues[0].message };
  }

  const supabase = await criarClienteServidor();

  const { error } = await supabase.from("feriados").insert({
    data: analise.data.data,
    descricao: analise.data.descricao,
  });

  if (error) {
    // 23505 = violação de chave primária, ou seja, a data já está na lista.
    return {
      ok: false,
      erro:
        error.code === "23505"
          ? "Essa data já está cadastrada."
          : error.message,
    };
  }

  revalidar();
  return { ok: true };
}

export async function removerFeriado(data: string): Promise<Resultado> {
  await exigirChefe();

  const supabase = await criarClienteServidor();

  const { error } = await supabase.from("feriados").delete().eq("data", data);

  if (error) return { ok: false, erro: error.message };

  revalidar();
  return { ok: true };
}
