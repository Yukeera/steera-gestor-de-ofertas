import { Suspense } from "react";
import type { Metadata } from "next";
import { addDays, parseISO, startOfMonth } from "date-fns";
import { BadgeCheck, CheckCheck, Clock, Cog, Percent } from "lucide-react";

import { exigirMembro } from "@/lib/auth/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import {
  assinarCaminhos,
  BUCKET_AVATARES,
  BUCKET_OFERTAS,
} from "@/lib/storage";
import { formatarData, hojeISO } from "@/lib/data";
import { paraISO } from "@/lib/agenda";
import {
  agruparPorSemana,
  calcularIndicadores,
  formatarPercentual,
  montarFunil,
  type OfertaParaMetrica,
} from "@/lib/painel";
import { FiltroPeriodo } from "@/components/painel/filtro-periodo";
import { FunilPeriodo } from "@/components/painel/funil-periodo";
import { GraficoConcluidas } from "@/components/painel/grafico-concluidas";
import {
  Alertas,
  CartaoIndicador,
  GaleriaValidadas,
  Produtividade,
  type Alerta,
  type LinhaDeProdutividade,
  type OfertaValidada,
} from "@/components/painel/pecas";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { estaAtrasada, type OfertaStatus } from "@/lib/dominio/tipos";

export const metadata: Metadata = { title: "Painel" };

/** Abaixo disso, uma linha sugeriria tendência que os dados não sustentam. */
const MINIMO_DE_PONTOS = 4;

function resolverPeriodo(
  atalho: string | undefined,
  de: string | undefined,
  ate: string | undefined,
): { de: string; ate: string } {
  const hoje = hojeISO();

  if (de || ate) {
    return { de: de ?? hoje, ate: ate ?? hoje };
  }

  if (atalho === "mes") {
    return { de: paraISO(startOfMonth(parseISO(hoje))), ate: hoje };
  }

  const dias = Number(atalho ?? 30);
  const janela = Number.isFinite(dias) && dias > 0 ? dias : 30;
  return { de: paraISO(addDays(parseISO(hoje), -(janela - 1))), ate: hoje };
}

type LinhaOferta = {
  id: string;
  nome: string;
  status: OfertaStatus;
  criada_em: string;
  escalada_em: string | null;
  data_prevista: string | null;
  data_conclusao: string | null;
  data_validacao: string | null;
  capa_path: string | null;
  oferta_etapas: {
    concluida: boolean;
    concluida_em: string | null;
    concluida_por: string | null;
    oferta_etapa_responsaveis: { membro_id: string }[];
  }[];
};

export default async function PaginaPainel({
  searchParams,
}: PageProps<"/painel">) {
  await exigirMembro();
  const supabase = await criarClienteServidor();

  const parametros = await searchParams;
  const primeiro = (v: string | string[] | undefined) =>
    Array.isArray(v) ? v[0] : v;

  const { de, ate } = resolverPeriodo(
    primeiro(parametros.p),
    primeiro(parametros.de),
    primeiro(parametros.ate),
  );

  const hoje = hojeISO();

  // Uma varredura só: os cinco indicadores, o gráfico e o funil respondem a
  // perguntas diferentes sobre o MESMO conjunto. Cinco consultas seriam cinco
  // idas à rede para calcular o que cabe numa passada em memória.
  const [
    { data: ofertasBrutas },
    { data: membrosBrutos },
    { data: tarefasBrutas },
    { data: prazoConfig },
  ] = await Promise.all([
    supabase
      .from("ofertas")
      .select(
        "id, nome, status, criada_em, escalada_em, data_prevista, data_conclusao, data_validacao, capa_path, oferta_etapas(concluida, concluida_em, concluida_por, oferta_etapa_responsaveis(membro_id))",
      ),
    supabase
      .from("membros")
      .select("id, nome, foto_path")
      .eq("ativo", true)
      .order("nome"),
    supabase
      .from("tarefas")
      .select("id, titulo, prazo, status, concluida_em, concluida_por"),
    supabase
      .from("configuracoes")
      .select("valor")
      .eq("chave", "dias_alerta_sem_validacao")
      .maybeSingle(),
  ]);

  const linhas = (ofertasBrutas ?? []) as unknown as LinhaOferta[];

  const ofertas: OfertaParaMetrica[] = linhas.map((l) => ({
    id: l.id,
    nome: l.nome,
    status: l.status,
    criadaEm: l.criada_em,
    escaladaEm: l.escalada_em,
    dataConclusao: l.data_conclusao,
    dataValidacao: l.data_validacao,
    capaUrl: null,
  }));

  const indicadores = calcularIndicadores(ofertas, de, ate);
  const pontos = agruparPorSemana(ofertas, de, ate);
  const estagios = montarFunil(ofertas, de, ate);

  const validadas = linhas.filter(
    (l) =>
      l.status === "VALIDADA" &&
      l.data_validacao &&
      l.data_validacao >= de &&
      l.data_validacao <= ate,
  );

  const [capas, avatares] = await Promise.all([
    assinarCaminhos(BUCKET_OFERTAS, validadas.map((l) => l.capa_path)),
    assinarCaminhos(BUCKET_AVATARES, (membrosBrutos ?? []).map((m) => m.foto_path)),
  ]);

  const galeria: OfertaValidada[] = validadas
    .sort((a, b) => (b.data_validacao ?? "").localeCompare(a.data_validacao ?? ""))
    .map((l) => ({
      id: l.id,
      nome: l.nome,
      capaUrl: l.capa_path ? (capas.get(l.capa_path) ?? null) : null,
      dataValidacao: l.data_validacao,
    }));

  /* ── Produtividade ─────────────────────────────────────────────────────── */

  const etapasPorMembro = new Map<string, number>();
  for (const linha of linhas) {
    for (const etapa of linha.oferta_etapas) {
      if (!etapa.concluida || !etapa.concluida_por || !etapa.concluida_em) continue;
      const dia = etapa.concluida_em.slice(0, 10);
      if (dia < de || dia > ate) continue;
      etapasPorMembro.set(
        etapa.concluida_por,
        (etapasPorMembro.get(etapa.concluida_por) ?? 0) + 1,
      );
    }
  }

  const tarefasPorMembro = new Map<string, number>();
  for (const tarefa of tarefasBrutas ?? []) {
    if (tarefa.status !== "CONCLUIDA" || !tarefa.concluida_por) continue;
    const dia = (tarefa.concluida_em as string | null)?.slice(0, 10);
    if (!dia || dia < de || dia > ate) continue;
    tarefasPorMembro.set(
      tarefa.concluida_por as string,
      (tarefasPorMembro.get(tarefa.concluida_por as string) ?? 0) + 1,
    );
  }

  const produtividade: LinhaDeProdutividade[] = (membrosBrutos ?? [])
    .map((m) => ({
      id: m.id,
      nome: m.nome,
      fotoUrl: m.foto_path ? (avatares.get(m.foto_path) ?? null) : null,
      etapas: etapasPorMembro.get(m.id) ?? 0,
      tarefas: tarefasPorMembro.get(m.id) ?? 0,
    }))
    .filter((l) => l.etapas + l.tarefas > 0)
    .sort((a, b) => b.etapas + b.tarefas - (a.etapas + a.tarefas));

  /* ── Alertas ───────────────────────────────────────────────────────────── */

  const agora = new Date();
  const diasParaAlerta = Number(prazoConfig?.valor ?? 7);
  const alertas: Alerta[] = [];

  const atrasadas = linhas.filter((l) =>
    estaAtrasada(l.status, l.data_prevista, agora),
  );
  if (atrasadas.length > 0) {
    alertas.push({
      chave: "atrasadas",
      texto: `${atrasadas.length} oferta${atrasadas.length === 1 ? " está atrasada" : "s estão atrasadas"}: o dia previsto passou e o roteiro não fechou.`,
      href: "/calendario",
    });
  }

  const semResponsavel = linhas.filter(
    (l) =>
      l.status === "NA_ESTEIRA" &&
      l.oferta_etapas.some(
        (e) => !e.concluida && e.oferta_etapa_responsaveis.length === 0,
      ),
  );
  if (semResponsavel.length > 0) {
    alertas.push({
      chave: "sem-dono",
      texto: `${semResponsavel.length} oferta${semResponsavel.length === 1 ? " ativa tem etapa" : "s ativas têm etapas"} sem responsável. Ninguém vai vê-las em "Minhas tarefas".`,
      href: "/ofertas?status=NA_ESTEIRA",
    });
  }

  const limite = paraISO(addDays(agora, -diasParaAlerta));
  const semValidacao = linhas.filter(
    (l) =>
      l.status === "CONCLUIDA" &&
      l.data_conclusao &&
      l.data_conclusao.slice(0, 10) <= limite,
  );
  if (semValidacao.length > 0) {
    alertas.push({
      chave: "sem-validacao",
      texto: `${semValidacao.length} oferta${semValidacao.length === 1 ? " está montada" : "s estão montadas"} há mais de ${diasParaAlerta} dias sem resultado registrado.`,
      href: "/ofertas?status=CONCLUIDA",
    });
  }

  const tarefasVencidas = (tarefasBrutas ?? []).filter(
    (t) => t.status === "ABERTA" && (t.prazo as string) < hoje,
  );
  if (tarefasVencidas.length > 0) {
    alertas.push({
      chave: "tarefas-vencidas",
      texto: `${tarefasVencidas.length} tarefa${tarefasVencidas.length === 1 ? " passou" : "s passaram"} do prazo.`,
      href: "/tarefas",
    });
  }

  const totalNoPeriodo = pontos.reduce((s, p) => s + p.quantidade, 0);

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl">Painel</h1>
        <p className="text-muted-foreground text-sm tabular">
          {formatarData(de)} a {formatarData(ate)}
        </p>
      </header>

      <Suspense fallback={<Skeleton className="h-16 w-full" />}>
        <FiltroPeriodo de={de} ate={ate} />
      </Suspense>

      {/* RF-09.1 — os números são o gráfico. */}
      <section aria-label="Indicadores do período">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <CartaoIndicador
            rotulo="Concluídas no período"
            valor={String(indicadores.concluidasNoPeriodo)}
            icone={CheckCheck}
          />
          <CartaoIndicador
            rotulo="Na esteira agora"
            valor={String(indicadores.naEsteiraAgora)}
            detalhe="Foto do presente, não do período."
            icone={Cog}
          />
          <CartaoIndicador
            rotulo="Validadas no período"
            valor={String(indicadores.validadasNoPeriodo)}
            icone={BadgeCheck}
            destaque={indicadores.validadasNoPeriodo > 0}
          />
          <CartaoIndicador
            rotulo="Taxa de validação"
            valor={formatarPercentual(indicadores.taxaDeValidacao)}
            detalhe={
              indicadores.taxaDeValidacao === null
                ? "Nenhuma oferta julgada ainda."
                : `${indicadores.validadasNoPeriodo} de ${indicadores.validadasNoPeriodo + indicadores.invalidadasNoPeriodo} julgadas.`
            }
            icone={Percent}
          />
          <CartaoIndicador
            rotulo="Peneira até montada"
            valor={
              indicadores.tempoMedioEmDias === null
                ? "—"
                : `${indicadores.tempoMedioEmDias}d`
            }
            detalhe="Tempo médio da ideia até a montagem."
            icone={Clock}
          />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent>
            {pontos.length >= MINIMO_DE_PONTOS ? (
              <GraficoConcluidas pontos={pontos} />
            ) : (
              // Menos de quatro semanas no período: dois pontos ligados por
              // uma reta sugeririam uma tendência que os dados não sustentam.
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Concluídas por semana</h3>
                <p className="font-mono text-3xl leading-none font-medium tabular">
                  {totalNoPeriodo}
                </p>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  O período tem {pontos.length} semana
                  {pontos.length === 1 ? "" : "s"} — poucas para desenhar uma
                  tendência. Escolha 90 dias para ver a evolução.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <FunilPeriodo estagios={estagios} />
          </CardContent>
        </Card>
      </div>

      <section aria-labelledby="t-validadas" className="space-y-3">
        <h2
          id="t-validadas"
          className="text-muted-foreground text-xs font-medium tracking-wide uppercase"
        >
          Validadas no período
        </h2>
        <GaleriaValidadas ofertas={galeria} />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="t-alertas" className="space-y-3">
          <h2
            id="t-alertas"
            className="text-muted-foreground text-xs font-medium tracking-wide uppercase"
          >
            Pedindo atenção
          </h2>
          <Alertas alertas={alertas} />
        </section>

        <section aria-labelledby="t-produtividade" className="space-y-3">
          <h2
            id="t-produtividade"
            className="text-muted-foreground text-xs font-medium tracking-wide uppercase"
          >
            Entregas por pessoa
          </h2>
          <Produtividade linhas={produtividade} />
        </section>
      </div>
    </div>
  );
}
