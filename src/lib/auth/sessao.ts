import { cache } from "react";
import { redirect } from "next/navigation";

import { criarClienteServidor } from "@/lib/supabase/server";
import type { Cargo, Funcao } from "@/lib/dominio/tipos";

export type MembroSessao = {
  id: string;
  nome: string;
  email: string;
  cargo: Cargo;
  /** Caminho no bucket `avatares`, nao URL. Assinar com lib/storage. */
  fotoPath: string | null;
  ativo: boolean;
  funcoes: Funcao[];
};

/**
 * Membro logado, com cargo e funções.
 *
 * Envolto em `cache` do React: várias partes da árvore pedem isso na mesma
 * renderização e não faz sentido ir ao banco toda vez.
 */
export const obterMembroAtual = cache(async (): Promise<MembroSessao | null> => {
  const supabase = await criarClienteServidor();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("membros")
    .select("id, nome, email, cargo, foto_path, ativo, membro_funcoes(funcao)")
    .eq("id", user.id)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    nome: data.nome,
    email: data.email,
    cargo: data.cargo as Cargo,
    fotoPath: data.foto_path,
    ativo: data.ativo,
    funcoes: (data.membro_funcoes ?? []).map(
      (f: { funcao: string }) => f.funcao as Funcao,
    ),
  };
});

/**
 * Mesma coisa, mas sai da renderização se não houver sessão válida.
 *
 * O usuário existe em auth.users mas não em `membros` quando o convite foi
 * criado e o perfil ainda não; e existe mas inativo quando foi desligado.
 * Nos dois casos ele não entra.
 */
export async function exigirMembro(): Promise<MembroSessao> {
  const membro = await obterMembroAtual();

  if (!membro) redirect("/login?erro=sem-perfil");
  if (!membro.ativo) redirect("/login?erro=inativo");

  return membro;
}

export function ehChefe(membro: MembroSessao): boolean {
  return membro.cargo === "CHEFE";
}

export function ehMestreOuChefe(membro: MembroSessao): boolean {
  return membro.cargo === "CHEFE" || membro.funcoes.includes("MESTRE_ESTEIRA");
}

/**
 * Para usar dentro de Server Actions: a UI já esconde o botão, mas a ação
 * precisa recusar por conta própria. O RLS ainda é a última linha.
 */
export async function exigirMestreOuChefe(): Promise<MembroSessao> {
  const membro = await exigirMembro();

  if (!ehMestreOuChefe(membro)) {
    throw new Error(
      "Esta ação é restrita ao Chefe e ao Mestre da Esteira.",
    );
  }

  return membro;
}

export async function exigirChefe(): Promise<MembroSessao> {
  const membro = await exigirMembro();

  if (!ehChefe(membro)) {
    throw new Error("Esta ação é restrita ao Chefe.");
  }

  return membro;
}
