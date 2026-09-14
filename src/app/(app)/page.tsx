import Link from "next/link";
import { CalendarDays, PackageOpen } from "lucide-react";

import { ehMestreOuChefe, exigirMembro } from "@/lib/auth/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import {
  assinarCaminhos,
  BUCKET_AVATARES,
  BUCKET_OFERTAS,
} from "@/lib/storage";
import { formatarDataPorExtenso, hojeISO } from "@/lib/data";
import {
  ChecklistMontagem,
  type EtapaDaChecklist,
  type MembroLeve,
} from "@/components/oferta/checklist-montagem";
import { HeroiOfertaDoDia } from "@/components/oferta/hero-oferta-do-dia";
import type { ItemDeTrabalho } from "@/components/tarefa/minhas-tarefas";
import {
  PainelDaFila,
  type MinhaEtapaDeHoje,
} from "@/components/tarefa/painel-da-fila";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { OfertaStatus } from "@/lib/dominio/tipos";

type LinhaOfertaDoDia = {
  id: string;
  nome: string;
  descricao: string;
  anunciante_referencia: string | null;
  url_referencia: string | null;
  capa_path: string | null;
  status: OfertaStatus;
  data_prevista: string | null;
  rodadas: { id: string; nome: string } | null;
  oferta_etapas: {
    id: string;
    ordem: number;
    titulo: string;
    descricao: string | null;
    concluida: boolean;
    oferta_etapa_responsaveis: {
      membros: { id: string; nome: string; foto_path: string | null } | null;
    }[];
  }[];
};

const SELECAO_OFERTA =
  "id, nome, descricao, anunciante_referencia, url_referencia, capa_path, status, data_prevista, rodadas(id, nome), oferta_etapas(id, ordem, titulo, descricao, concluida, oferta_etapa_responsaveis(membros(id, nome, foto_path)))";

export default async function PaginaHoje() {
  const membro = await exigirMembro();
  const podeDelegar = ehMestreOuChefe(membro);
  const supabase = await criarClienteServidor();
  const hoje = hojeISO();

  const [
    { data: doDia },
    { data: equipeBruta },
    { data: minhasEtapas },
    { data: minhasTarefas },
  ] = await Promise.all([
    supabase
      .from("ofertas")
      .select(SELECAO_OFERTA)
      .eq("data_prevista", hoje)
      .in("status", ["NA_ESTEIRA", "CONCLUIDA"])
      .maybeSingle(),
    supabase
      .from("membros")
      .select("id, nome, foto_path")
      .eq("ativo", true)
      .order("nome"),
    // RF-06.7: tudo que está aberto no nome da pessoa, em qualquer oferta.
    supabase
      .from("oferta_etapa_responsaveis")
      .select(
        "oferta_etapas!inner(id, titulo, concluida, ofertas!inner(id, nome, status, data_prevista))",
      )
      .eq("membro_id", membro.id)
      .eq("oferta_etapas.concluida", false)
      .eq("oferta_etapas.ofertas.status", "NA_ESTEIRA"),
    // As tarefas individuais entram na MESMA lista. O RLS já garante que
    // só chegam as designadas a esta pessoa.
    supabase
      .from("tarefas")
      .select("id, titulo, prazo, prioridade, ofertas(id, nome)")
      .eq("status", "ABERTA")
      .order("prazo"),
  ]);

  const oferta = doDia as unknown as LinhaOfertaDoDia | null;

  // RF-06.6: sem oferta hoje, mostrar a próxima em vez de um vazio seco.
  const { data: proxima } = oferta
    ? { data: null }
    : await supabase
        .from("ofertas")
        .select("id, nome, data_prevista")
        .gt("data_prevista", hoje)
        .eq("status", "NA_ESTEIRA")
        .order("data_prevista", { ascending: true })
        .limit(1)
        .maybeSingle();

  const caminhosDeFoto = [
    ...(equipeBruta ?? []).map((m) => m.foto_path),
    ...(oferta?.oferta_etapas ?? []).flatMap((e) =>
      e.oferta_etapa_responsaveis.map((r) => r.membros?.foto_path),
    ),
  ];

  const [capas, avatares] = await Promise.all([
    assinarCaminhos(BUCKET_OFERTAS, [oferta?.capa_path]),
    assinarCaminhos(BUCKET_AVATARES, caminhosDeFoto),
  ]);

  const urlDeFoto = (caminho: string | null | undefined) =>
    caminho ? (avatares.get(caminho) ?? null) : null;

  const equipe: MembroLeve[] = (equipeBruta ?? []).map((m) => ({
    id: m.id,
    nome: m.nome,
    fotoUrl: urlDeFoto(m.foto_path),
  }));

  const etapas: EtapaDaChecklist[] = [...(oferta?.oferta_etapas ?? [])]
    .sort((a, b) => a.ordem - b.ordem)
    .map((e) => ({
      id: e.id,
      ordem: e.ordem,
      titulo: e.titulo,
      descricao: e.descricao,
      concluida: e.concluida,
      responsaveis: e.oferta_etapa_responsaveis
        .filter((r) => r.membros)
        .map((r) => ({
          id: r.membros!.id,
          nome: r.membros!.nome,
          fotoUrl: urlDeFoto(r.membros!.foto_path),
        })),
    }));

  /**
   * RF-06.7 — etapas de oferta e tarefas individuais na mesma lista.
   *
   * São origens diferentes com o mesmo significado para quem executa: algo
   * aberto no meu nome, com uma data. Separá-las em dois blocos obrigaria a
   * pessoa a cruzar as duas listas de cabeça para saber o que fazer primeiro.
   */
  /**
   * A fila pessoal exclui a oferta de hoje.
   *
   * As etapas dela já estão no Roteiro de Montagem, logo acima, com caixa de
   * conclusão. Repeti-las aqui criava duas caixas para a mesma etapa e a
   * dúvida sobre qual marcar. Cada informação num lugar só.
   */
  const itens: ItemDeTrabalho[] = [
    ...(
      (minhasEtapas ?? []) as unknown as {
        oferta_etapas: {
          id: string;
          titulo: string;
          ofertas: { id: string; nome: string; data_prevista: string | null };
        };
      }[]
    )
      .filter(({ oferta_etapas: e }) => e.ofertas.id !== oferta?.id)
      .map(({ oferta_etapas: e }) => ({
        chave: `etapa-${e.id}`,
        id: e.id,
        titulo: e.titulo,
        origem: "etapa" as const,
        contexto: { id: e.ofertas.id, nome: e.ofertas.nome },
        data: e.ofertas.data_prevista,
        alta: false,
        atrasado: Boolean(
          e.ofertas.data_prevista && e.ofertas.data_prevista < hoje,
        ),
        hoje: e.ofertas.data_prevista === hoje,
      })),
    ...(
      (minhasTarefas ?? []) as unknown as {
        id: string;
        titulo: string;
        prazo: string;
        prioridade: string;
        ofertas: { id: string; nome: string } | null;
      }[]
    ).map((t) => ({
      chave: `tarefa-${t.id}`,
      id: t.id,
      titulo: t.titulo,
      origem: "tarefa" as const,
      contexto: t.ofertas,
      data: t.prazo,
      alta: t.prioridade === "ALTA",
      atrasado: t.prazo < hoje,
      hoje: t.prazo === hoje,
    })),
  ].sort((a, b) => (a.data ?? "").localeCompare(b.data ?? ""));

  // As etapas da oferta de hoje que estão no nome de quem está olhando.
  const minhasEtapasDeHoje: MinhaEtapaDeHoje[] = etapas
    .filter((e) => e.responsaveis.some((r) => r.id === membro.id))
    .map((e) => ({
      id: e.id,
      ordem: e.ordem,
      titulo: e.titulo,
      concluida: e.concluida,
    }));

  const primeiroNome = membro.nome.split(" ")[0];
  const capaUrl = oferta?.capa_path
    ? (capas.get(oferta.capa_path) ?? null)
    : null;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-muted-foreground text-sm">
          {formatarDataPorExtenso(hoje)}
        </p>
        <h1 className="text-2xl">Oi, {primeiroNome}</h1>
      </header>

      {/* Duas colunas a partir de 1024px: a montagem da equipe à esquerda, o
          que é da pessoa à direita. Abaixo disso empilha, e a coluna da
          pessoa vem depois — em tela estreita, o trabalho do dia vem antes
          do resumo dele. */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <section aria-labelledby="titulo-oferta-hoje" className="space-y-4">
          <h2
            id="titulo-oferta-hoje"
            className="text-muted-foreground text-xs font-medium tracking-wide uppercase"
          >
            Oferta de hoje
          </h2>

          {oferta ? (
            <>
              <HeroiOfertaDoDia
                oferta={{
                  id: oferta.id,
                  nome: oferta.nome,
                  descricao: oferta.descricao,
                  anuncianteReferencia: oferta.anunciante_referencia,
                  urlReferencia: oferta.url_referencia,
                  capaUrl: capaUrl,
                  status: oferta.status,
                  rodada: oferta.rodadas,
                  totalEtapas: etapas.length,
                  etapasConcluidas: etapas.filter((e) => e.concluida).length,
                }}
              />

              <ChecklistMontagem
                ofertaId={oferta.id}
                etapasIniciais={etapas}
                equipe={equipe}
                podeDelegar={podeDelegar}
                membroId={membro.id}
              />
            </>
          ) : proxima ? (
            <EstadoVazio
              icone={CalendarDays}
              titulo="Nada na esteira hoje"
              descricao={`A próxima é "${proxima.nome}", em ${formatarDataPorExtenso(proxima.data_prevista!)}.`}
              acao={{ href: "/calendario", rotulo: "Ver o calendário" }}
            />
          ) : (
            <EstadoVazio
              icone={PackageOpen}
              titulo="A esteira ainda não começou a girar"
              descricao={
                podeDelegar
                  ? "Cadastre ideias na Peneira e monte a primeira Rodada para distribuir as ofertas pelos dias úteis."
                  : "Assim que o Mestre da Esteira montar uma Rodada, a oferta do dia aparece aqui."
              }
              acao={
                podeDelegar
                  ? { href: "/rodadas/nova", rotulo: "Montar Rodada" }
                  : undefined
              }
            />
          )}
        </section>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <PainelDaFila minhasEtapas={minhasEtapasDeHoje} itens={itens} />
        </aside>
      </div>
    </div>
  );
}

function EstadoVazio({
  icone: Icone,
  titulo,
  descricao,
  acao,
}: {
  icone: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  titulo: string;
  descricao: string;
  acao?: { href: string; rotulo: string };
}) {
  return (
    <Card className="border-dashed shadow-none">
      <CardContent className="flex flex-col items-center gap-3 px-6 py-12 text-center">
        <Icone className="text-muted-foreground size-8" aria-hidden />
        <div className="space-y-1">
          <p className="font-medium">{titulo}</p>
          <p className="text-muted-foreground mx-auto max-w-md text-sm leading-relaxed">
            {descricao}
          </p>
        </div>
        {acao ? (
          <Button asChild variant="secondary" size="sm" className="mt-1">
            <Link href={acao.href}>{acao.rotulo}</Link>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
