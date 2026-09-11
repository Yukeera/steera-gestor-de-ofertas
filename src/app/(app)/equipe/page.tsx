import type { Metadata } from "next";

import { ehChefe, exigirMembro } from "@/lib/auth/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { assinarCaminhos, BUCKET_AVATARES } from "@/lib/storage";
import { DialogoMembro } from "@/components/equipe/dialogo-membro";
import {
  CartaoMembro,
  type MembroDaGrade,
} from "@/components/equipe/cartao-membro";
import type { Cargo, Funcao } from "@/lib/dominio/tipos";

export const metadata: Metadata = { title: "Equipe" };

type LinhaMembro = {
  id: string;
  nome: string;
  email: string;
  cargo: Cargo;
  ativo: boolean;
  foto_path: string | null;
  membro_funcoes: { funcao: Funcao }[] | null;
};

export default async function PaginaEquipe() {
  const eu = await exigirMembro();
  const souChefe = ehChefe(eu);
  const supabase = await criarClienteServidor();

  const { data, error } = await supabase
    .from("membros")
    .select("id, nome, email, cargo, ativo, foto_path, membro_funcoes(funcao)")
    .order("ativo", { ascending: false })
    .order("nome");

  const linhas = (data ?? []) as LinhaMembro[];

  // Uma assinatura em lote para todas as fotos, não uma por card.
  const urls = await assinarCaminhos(
    BUCKET_AVATARES,
    linhas.map((l) => l.foto_path),
  );

  const membros: MembroDaGrade[] = linhas.map((l) => ({
    id: l.id,
    nome: l.nome,
    email: l.email,
    cargo: l.cargo,
    ativo: l.ativo,
    funcoes: (l.membro_funcoes ?? []).map((f) => f.funcao),
    fotoUrl: l.foto_path ? (urls.get(l.foto_path) ?? null) : null,
  }));

  const ativos = membros.filter((m) => m.ativo).length;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl">Equipe</h1>
          <p className="text-muted-foreground text-sm">
            {ativos === 1
              ? "1 pessoa na esteira"
              : `${ativos} pessoas na esteira`}
            {membros.length > ativos
              ? ` · ${membros.length - ativos} desativada(s)`
              : ""}
          </p>
        </div>

        {souChefe ? <DialogoMembro /> : null}
      </header>

      {error ? (
        <p role="alert" className="text-destructive text-sm">
          Não foi possível carregar a equipe: {error.message}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {membros.map((membro) => (
          <CartaoMembro
            key={membro.id}
            membro={membro}
            podeEditar={souChefe}
            ehVoce={membro.id === eu.id}
          />
        ))}
      </div>
    </div>
  );
}
