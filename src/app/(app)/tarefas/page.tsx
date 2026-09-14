import type { Metadata } from "next";
import { ListChecks } from "lucide-react";

import { ehMestreOuChefe, exigirMembro } from "@/lib/auth/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { assinarCaminhos, BUCKET_AVATARES } from "@/lib/storage";
import { DialogoTarefa } from "@/components/tarefa/dialogo-tarefa";
import {
  LinhaTarefa,
  type TarefaDaLista,
} from "@/components/tarefa/linha-tarefa";
import { Card, CardContent } from "@/components/ui/card";
import type { Prioridade, TarefaStatus } from "@/lib/dominio/tipos";

export const metadata: Metadata = { title: "Tarefas" };

type LinhaBruta = {
  id: string;
  titulo: string;
  descricao: string | null;
  prazo: string;
  prioridade: Prioridade;
  status: TarefaStatus;
  motivo_cancelamento: string | null;
  ofertas: { id: string; nome: string } | null;
  tarefa_responsaveis: {
    membros: { id: string; nome: string; foto_path: string | null } | null;
  }[];
};

export default async function PaginaTarefas() {
  const membro = await exigirMembro();
  const podeGerir = ehMestreOuChefe(membro);
  const supabase = await criarClienteServidor();

  // RF-07.6: o RLS já filtra — Chefe e Mestre veem todas, funcionário vê as
  // suas. A consulta é a mesma para os dois; quem decide é o banco.
  const [{ data: brutas, error }, { data: equipeBruta }, { data: ofertasBrutas }] =
    await Promise.all([
      supabase
        .from("tarefas")
        .select(
          "id, titulo, descricao, prazo, prioridade, status, motivo_cancelamento, ofertas(id, nome), tarefa_responsaveis(membros(id, nome, foto_path))",
        )
        .order("status")
        .order("prazo"),
      supabase
        .from("membros")
        .select("id, nome, foto_path")
        .eq("ativo", true)
        .order("nome"),
      supabase
        .from("ofertas")
        .select("id, nome")
        .in("status", ["NA_PENEIRA", "NA_ESTEIRA", "CONCLUIDA"])
        .order("nome"),
    ]);

  const linhas = (brutas ?? []) as unknown as LinhaBruta[];

  const avatares = await assinarCaminhos(BUCKET_AVATARES, [
    ...(equipeBruta ?? []).map((m) => m.foto_path),
    ...linhas.flatMap((l) =>
      l.tarefa_responsaveis.map((r) => r.membros?.foto_path),
    ),
  ]);

  const url = (caminho: string | null | undefined) =>
    caminho ? (avatares.get(caminho) ?? null) : null;

  const equipe = (equipeBruta ?? []).map((m) => ({
    id: m.id,
    nome: m.nome,
    fotoUrl: url(m.foto_path),
  }));

  const ofertas = (ofertasBrutas ?? []).map((o) => ({ id: o.id, nome: o.nome }));

  const tarefas: TarefaDaLista[] = linhas.map((l) => ({
    id: l.id,
    titulo: l.titulo,
    descricao: l.descricao,
    prazo: l.prazo,
    prioridade: l.prioridade,
    status: l.status,
    motivoCancelamento: l.motivo_cancelamento,
    oferta: l.ofertas,
    responsaveis: l.tarefa_responsaveis
      .filter((r) => r.membros)
      .map((r) => ({
        id: r.membros!.id,
        nome: r.membros!.nome,
        fotoUrl: url(r.membros!.foto_path),
      })),
  }));

  const abertas = tarefas.filter((t) => t.status === "ABERTA");
  const fechadas = tarefas.filter((t) => t.status !== "ABERTA");

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl">Tarefas</h1>
          <p className="text-muted-foreground text-sm">
            {podeGerir
              ? "Trabalho individual, fora do roteiro das ofertas."
              : "O que foi designado a você fora do roteiro das ofertas."}
          </p>
        </div>

        {podeGerir ? (
          <DialogoTarefa equipe={equipe} ofertas={ofertas} />
        ) : null}
      </header>

      {error ? (
        <p role="alert" className="text-destructive text-sm">
          Não foi possível carregar as tarefas: {error.message}
        </p>
      ) : null}

      {tarefas.length === 0 ? (
        <Card className="border-dashed shadow-none">
          <CardContent className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <ListChecks
              className="text-muted-foreground size-8"
              aria-hidden="true"
            />
            <div className="space-y-1">
              <p className="font-medium">Nenhuma tarefa</p>
              <p className="text-muted-foreground mx-auto max-w-md text-sm leading-relaxed">
                {podeGerir
                  ? "Use tarefas para o que não cabe no roteiro de uma oferta — uma revisão, um ajuste pontual, uma pesquisa."
                  : "Quando o Chefe ou o Mestre da Esteira designar algo a você, aparece aqui e na tela Hoje."}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <section className="space-y-2">
            <h2 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Abertas <span className="tabular">({abertas.length})</span>
            </h2>
            {abertas.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Nada aberto no momento.
              </p>
            ) : (
              <ul className="divide-y rounded-lg border">
                {abertas.map((tarefa) => (
                  <LinhaTarefa
                    key={tarefa.id}
                    tarefa={tarefa}
                    podeGerir={podeGerir}
                    equipe={equipe}
                    ofertas={ofertas}
                  />
                ))}
              </ul>
            )}
          </section>

          {fechadas.length > 0 ? (
            <section className="space-y-2">
              <h2 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                Concluídas e canceladas{" "}
                <span className="tabular">({fechadas.length})</span>
              </h2>
              <ul className="divide-y rounded-lg border">
                {fechadas.map((tarefa) => (
                  <LinhaTarefa
                    key={tarefa.id}
                    tarefa={tarefa}
                    podeGerir={podeGerir}
                    equipe={equipe}
                    ofertas={ofertas}
                  />
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
