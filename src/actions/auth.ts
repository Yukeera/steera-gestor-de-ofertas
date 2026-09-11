"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { criarClienteServidor } from "@/lib/supabase/server";

export type EstadoFormulario = {
  erro?: string;
  campo?: "email" | "senha";
};

const esquemaLogin = z.object({
  email: z.string().email("Informe um e-mail válido."),
  senha: z.string().min(1, "Informe sua senha."),
  proximo: z.string().optional(),
});

export async function entrar(
  _estadoAnterior: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const analise = esquemaLogin.safeParse({
    email: formData.get("email"),
    senha: formData.get("senha"),
    proximo: formData.get("proximo") ?? undefined,
  });

  if (!analise.success) {
    const primeiro = analise.error.issues[0];
    return {
      erro: primeiro.message,
      campo: primeiro.path[0] === "senha" ? "senha" : "email",
    };
  }

  const { email, senha, proximo } = analise.data;
  const supabase = await criarClienteServidor();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: senha,
  });

  if (error) {
    // Mensagem única para credencial errada: dizer qual dos dois está errado
    // entregaria quais e-mails existem na base.
    return {
      erro:
        error.message === "Invalid login credentials"
          ? "E-mail ou senha incorretos."
          : "Não foi possível entrar agora. Tente de novo em instantes.",
      campo: "senha",
    };
  }

  // `redirect` lança uma exceção de controle de fluxo do Next: precisa ficar
  // fora de qualquer try/catch para não ser engolida.
  const destino = proximo && proximo.startsWith("/") ? proximo : "/";
  revalidatePath("/", "layout");
  redirect(destino);
}

export async function sair() {
  const supabase = await criarClienteServidor();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
