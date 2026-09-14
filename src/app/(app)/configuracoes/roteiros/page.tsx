import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ehMestreOuChefe, exigirMembro } from "@/lib/auth/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { DialogoRoteiro } from "@/components/roteiro/dialogo-roteiro";
import {
  CartaoRoteiro,
  type RoteiroDaLista,
} from "@/components/roteiro/cartao-roteiro";
import type { Funcao } from "@/lib/dominio/tipos";

export const metadata: Metadata = { title: "Roteiros de Montagem" };

type LinhaRoteiro = {
  id: string;
  nome: string;
  descricao: string | null;
  e_padrao: boolean;
  arquivado: boolean;
  roteiro_etapas: {
    ordem: number;
    titulo: string;
    roteiro_etapa_funcoes: { funcao: Funcao }[] | null;
  }[];
  ofertas: { count: number }[];
};

export default async function PaginaRoteiros() {
  const membro = await exigirMembro();

  // A UI já esconde o item do menu, mas a rota é alcançável por URL direta.
  if (!ehMestreOuChefe(membro)) redirect("/");

  const supabase = await criarClienteServidor();

  const { data, error } = await supabase
    .from("roteiros")
    .select(
      "id, nome, descricao, e_padrao, arquivado, roteiro_etapas(ordem, titulo, roteiro_etapa_funcoes(funcao)), ofertas(count)",
    )
    .order("arquivado")
    .order("e_padrao", { ascending: false })
    .order("nome");

  const linhas = (data ?? []) as unknown as LinhaRoteiro[];

  const roteiros: RoteiroDaLista[] = linhas.map((l) => ({
    id: l.id,
    nome: l.nome,
    descricao: l.descricao,
    ePadrao: l.e_padrao,
    arquivado: l.arquivado,
    ofertasQueUsaram: l.ofertas?.[0]?.count ?? 0,
    etapas: [...(l.roteiro_etapas ?? [])]
      .sort((a, b) => a.ordem - b.ordem)
      .map((e) => ({
        titulo: e.titulo,
        funcoes: (e.roteiro_etapa_funcoes ?? []).map((f) => f.funcao),
      })),
  }));

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed">
          O passo a passo que cada oferta percorre. Ao entrar numa Rodada, a
          oferta leva uma <strong>cópia</strong> do roteiro — então mexer aqui
          não altera nada que já está na esteira.
        </p>

        <DialogoRoteiro />
      </header>

      {error ? (
        <p role="alert" className="text-destructive text-sm">
          Não foi possível carregar os roteiros: {error.message}
        </p>
      ) : null}

      <ul className="grid gap-4 lg:grid-cols-2">
        {roteiros.map((roteiro) => (
          <li key={roteiro.id}>
            <CartaoRoteiro roteiro={roteiro} />
          </li>
        ))}
      </ul>
    </div>
  );
}
