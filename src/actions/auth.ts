"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { criarClienteServidor } from "@/lib/supabase/server";

export type EstadoFormulario = {
  erro?: string;
  campo?: "email" | "senha" | "confirmacao";
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

const esquemaSenha = z
  .object({
    senha: z
      .string()
      .min(8, "A senha precisa ter ao menos 8 caracteres.")
      .max(72, "A senha pode ter no máximo 72 caracteres."),
    confirmacao: z.string(),
  })
  .refine((d) => d.senha === d.confirmacao, {
    message: "As duas senhas não são iguais.",
    path: ["confirmacao"],
  });

/**
 * Define a senha de quem chegou por um link de convite ou de recuperação.
 *
 * Pressupõe sessão válida: quem chega aqui já passou pela troca do token em
 * /auth/confirm. Sem sessão, `updateUser` não teria em quem mexer.
 */
export async function definirSenha(
  _estadoAnterior: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const analise = esquemaSenha.safeParse({
    senha: formData.get("senha"),
    confirmacao: formData.get("confirmacao"),
  });

  if (!analise.success) {
    const primeiro = analise.error.issues[0];
    return {
      erro: primeiro.message,
      campo: primeiro.path[0] === "confirmacao" ? "confirmacao" : "senha",
    };
  }

  const supabase = await criarClienteServidor();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      erro: "Seu link expirou antes de você terminar. Peça um novo convite.",
      campo: "senha",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: analise.data.senha,
  });

  if (error) {
    return { erro: error.message, campo: "senha" };
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function sair() {
  const supabase = await criarClienteServidor();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
