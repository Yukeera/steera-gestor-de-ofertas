import { Suspense } from "react";
import type { Metadata } from "next";
import { CalendarDays } from "lucide-react";

import { ehMestreOuChefe, exigirMembro } from "@/lib/auth/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import {
  assinarCaminhos,
  BUCKET_AVATARES,
  BUCKET_OFERTAS,
} from "@/lib/storage";
import { hojeISO } from "@/lib/data";
import {
  intervaloVisivel,
  montarGrade,
  type Periodo,
} from "@/lib/calendario";
import { ControlesCalendario } from "@/components/calendario/controles-calendario";
import { GradeCalendario } from "@/components/calendario/grade-calendario";
import type { EtapaResumida } from "@/components/calendario/popup-oferta";
import type {
  OfertaNoCalendario,
  TarefaNoCalendario,
} from "@/components/calendario/tipos";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { estaAtrasada, type OfertaStatus, type Prioridade } from "@/lib/dominio/tipos";

export const metadata: Metadata = { title: "Calendário" };

type LinhaOferta = {
  id: string;
  nome: string;
  descricao: string;
  status: OfertaStatus;
  data_prevista: string;
  capa_path: string | null;
  rodada_id: string | null;
  rodadas: { id: string; nome: string } | null;
  oferta_etapas: {
    id: string;
    ordem: number;
    titulo: string;
    concluida: boolean;
    oferta_etapa_responsaveis: {
      membro_id: string;
      membros: { id: string; nome: string; foto_path: string | null } | null;
    }[];
  }[];
};

type LinhaTarefa = {
  id: string;
  titulo: string;
  prazo: string;
  prioridade: Prioridade;
  tarefa_responsaveis: {
    membro_id: string;
    membros: { id: string; nome: string; foto_path: string | null } | null;
  }[];
};

export default async function PaginaCalendario({
  searchParams,
}: PageProps<"/calendario">) {
  const membro = await exigirMembro();
  const podeMover = ehMestreOuChefe(membro);
  const supabase = await criarClienteServidor();

  const parametros = await searchParams;
  const primeiro = (v: string | string[] | undefined) =>
    Array.isArray(v) ? v[0] : v;

  const hoje = hojeISO();
  const periodo = (primeiro(parametros.vis) === "semana"
    ? "semana"
    : "mes") as Periodo;
  const referencia =
    primeiro(parametros.ref) ?? (periodo === "mes" ? hoje.slice(0, 7) : hoje);

  const soMinhas = primeiro(parametros.minhas) === "1";
  const verTarefas = primeiro(parametros.tarefas) !== "0";
  const rodadaId = primeiro(parametros.rodada);

  const { inicio, fim } = intervaloVisivel(referencia, periodo);

  let consultaOfertas = supabase
    .from("ofertas")
    .select(
      "id, nome, descricao, status, data_prevista, capa_path, rodada_id, rodadas(id, nome), oferta_etapas(id, ordem, titulo, concluida, oferta_etapa_responsaveis(membro_id, membros(id, nome, foto_path)))",
    )
    .gte("data_prevista", inicio)
    .lte("data_prevista", fim)
    .not("data_prevista", "is", null);

  if (rodadaId) consultaOfertas = consultaOfertas.eq("rodada_id", rodadaId);

  const [{ data: ofertasBrutas }, { data: tarefasBrutas }, { data: rodadas }] =
    await Promise.all([
      consultaOfertas,
      verTarefas
        ? supabase
            .from("tarefas")
            .select(
              "id, titulo, prazo, prioridade, tarefa_responsaveis(membro_id, membros(id, nome, foto_path))",
            )
            .gte("prazo", inicio)
            .lte("prazo", fim)
            .eq("status", "ABERTA")
        : Promise.resolve({ data: [] }),
      supabase
        .from("rodadas")
        .select("id, nome")
        .neq("status", "CANCELADA")
        .order("data_inicio", { ascending: false }),
    ]);

  const linhasOferta = (ofertasBrutas ?? []) as unknown as LinhaOferta[];
  const linhasTarefa = (tarefasBrutas ?? []) as unknown as LinhaTarefa[];

  const [capas, avatares] = await Promise.all([
    assinarCaminhos(BUCKET_OFERTAS, linhasOferta.map((l) => l.capa_path)),
    assinarCaminhos(BUCKET_AVATARES, [
      ...linhasOferta.flatMap((l) =>
        l.oferta_etapas.flatMap((e) =>
          e.oferta_etapa_responsaveis.map((r) => r.membros?.foto_path),
        ),
      ),
      ...linhasTarefa.flatMap((t) =>
        t.tarefa_responsaveis.map((r) => r.membros?.foto_path),
      ),
    ]),
  ]);

  const url = (caminho: string | null | undefined) =>
    caminho ? (avatares.get(caminho) ?? null) : null;

  const agora = new Date();
  const etapasPorOferta: Record<string, EtapaResumida[]> = {};

  const ofertas: OfertaNoCalendario[] = linhasOferta.map((l) => {
    const etapas = [...l.oferta_etapas].sort((a, b) => a.ordem - b.ordem);

    etapasPorOferta[l.id] = etapas.map((e) => ({
      id: e.id,
      ordem: e.ordem,
      titulo: e.titulo,
      concluida: e.concluida,
      responsaveis: e.oferta_etapa_responsaveis
        .filter((r) => r.membros)
        .map((r) => ({
          id: r.membros!.id,
          nome: r.membros!.nome,
          fotoUrl: url(r.membros!.foto_path),
        })),
    }));

    // Uma pessoa por card, mesmo sendo dona de várias etapas.
    const responsaveis = new Map<
      string,
      { id: string; nome: string; fotoUrl: string | null }
    >();
    let minha = false;

    for (const etapa of etapas) {
      for (const r of etapa.oferta_etapa_responsaveis) {
        if (r.membro_id === membro.id) minha = true;
        if (r.membros) {
          responsaveis.set(r.membros.id, {
            id: r.membros.id,
            nome: r.membros.nome,
            fotoUrl: url(r.membros.foto_path),
          });
        }
      }
    }

    return {
      id: l.id,
      nome: l.nome,
      descricao: l.descricao,
      status: l.status,
      dataPrevista: l.data_prevista,
      capaUrl: l.capa_path ? (capas.get(l.capa_path) ?? null) : null,
      rodada: l.rodadas,
      totalEtapas: etapas.length,
      etapasConcluidas: etapas.filter((e) => e.concluida).length,
      responsaveis: [...responsaveis.values()],
      atrasada: estaAtrasada(l.status, l.data_prevista, agora),
      minha,
    };
  });

  const tarefas: TarefaNoCalendario[] = linhasTarefa.map((t) => ({
    id: t.id,
    titulo: t.titulo,
    prazo: t.prazo,
    prioridade: t.prioridade,
    minha: t.tarefa_responsaveis.some((r) => r.membro_id === membro.id),
    responsaveis: t.tarefa_responsaveis
      .filter((r) => r.membros)
      .map((r) => ({
        id: r.membros!.id,
        nome: r.membros!.nome,
        fotoUrl: url(r.membros!.foto_path),
      })),
  }));

  // O filtro "só o que é meu" é aplicado aqui, não na consulta: a pertinência
  // depende de responsáveis em etapas aninhadas, que o PostgREST filtraria
  // removendo as próprias etapas do resultado em vez de a oferta inteira.
  const ofertasVisiveis = soMinhas ? ofertas.filter((o) => o.minha) : ofertas;
  const tarefasVisiveis = soMinhas ? tarefas.filter((t) => t.minha) : tarefas;

  const feriadosNoIntervalo = await supabase
    .from("feriados")
    .select("data")
    .gte("data", inicio)
    .lte("data", fim);

  const feriados = new Set(
    (feriadosNoIntervalo.data ?? []).map((f) => f.data as string),
  );

  const dias = montarGrade(referencia, periodo, feriados);

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl">Calendário</h1>
        <p className="text-muted-foreground text-sm">
          Uma oferta por dia útil.{" "}
          {podeMover
            ? "Arraste um card para remanejar, ou use o menu do card."
            : "Clique num card para ver a montagem."}
        </p>
      </header>

      <Suspense fallback={<Skeleton className="h-32 w-full" />}>
        <ControlesCalendario
          referencia={referencia}
          periodo={periodo}
          hoje={hoje}
          rodadas={rodadas ?? []}
        />
      </Suspense>

      {ofertasVisiveis.length === 0 && tarefasVisiveis.length === 0 ? (
        <Card className="border-dashed shadow-none">
          <CardContent className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <CalendarDays
              className="text-muted-foreground size-8"
              aria-hidden="true"
            />
            <div className="space-y-1">
              <p className="font-medium">Nada agendado neste período</p>
              <p className="text-muted-foreground mx-auto max-w-md text-sm leading-relaxed">
                {soMinhas
                  ? "Desligue o filtro “Só o que é meu” para ver o que a equipe tem pela frente."
                  : "Monte uma Rodada para distribuir ofertas pelos dias úteis."}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <GradeCalendario
          dias={dias}
          ofertas={ofertasVisiveis}
          tarefas={tarefasVisiveis}
          etapasPorOferta={etapasPorOferta}
          podeMover={podeMover}
          compacto={periodo === "semana"}
        />
      )}
    </div>
  );
}
