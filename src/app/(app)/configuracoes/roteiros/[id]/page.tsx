import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { ehMestreOuChefe, exigirMembro } from "@/lib/auth/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import {
  EditorEtapas,
  type EtapaEditavel,
} from "@/components/roteiro/editor-etapas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Funcao } from "@/lib/dominio/tipos";

export const metadata: Metadata = { title: "Editar roteiro" };

type LinhaRoteiro = {
  id: string;
  nome: string;
  descricao: string | null;
  e_padrao: boolean;
  arquivado: boolean;
  roteiro_etapas: {
    id: string;
    ordem: number;
    titulo: string;
    descricao: string | null;
    roteiro_etapa_funcoes: { funcao: Funcao }[] | null;
  }[];
};

export default async function PaginaEditarRoteiro({
  params,
}: PageProps<"/configuracoes/roteiros/[id]">) {
  const membro = await exigirMembro();
  if (!ehMestreOuChefe(membro)) redirect("/");

  const { id } = await params;
  const supabase = await criarClienteServidor();

  const { data } = await supabase
    .from("roteiros")
    .select(
      "id, nome, descricao, e_padrao, arquivado, roteiro_etapas(id, ordem, titulo, descricao, roteiro_etapa_funcoes(funcao))",
    )
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();

  const roteiro = data as unknown as LinhaRoteiro;

  const etapas: EtapaEditavel[] = [...(roteiro.roteiro_etapas ?? [])]
    .sort((a, b) => a.ordem - b.ordem)
    .map((e) => ({
      chave: e.id,
      titulo: e.titulo,
      descricao: e.descricao ?? "",
      funcoes: (e.roteiro_etapa_funcoes ?? []).map((f) => f.funcao),
    }));

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/configuracoes/roteiros">
            <ArrowLeft aria-hidden="true" />
            Roteiros
          </Link>
        </Button>
      </div>

      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl">{roteiro.nome}</h1>
          {roteiro.e_padrao ? <Badge>Padrão</Badge> : null}
          {roteiro.arquivado ? (
            <Badge variant="outline" className="border-dashed">
              Arquivado
            </Badge>
          ) : null}
        </div>
        {roteiro.descricao ? (
          <p className="text-muted-foreground text-sm leading-relaxed">
            {roteiro.descricao}
          </p>
        ) : null}
        <p className="text-muted-foreground text-sm leading-relaxed">
          A função sugerida de cada etapa é o que pré-preenche o responsável
          quando a oferta entra numa Rodada. Havendo exatamente uma pessoa ativa
          com aquela função, ela já entra como dona; havendo mais de uma, a vaga
          fica aberta para o Mestre delegar.
        </p>
      </header>

      <EditorEtapas roteiroId={roteiro.id} etapasIniciais={etapas} />
    </div>
  );
}
