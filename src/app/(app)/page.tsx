import Link from "next/link";
import {
  CalendarDays,
  ExternalLink,
  ImageOff,
  ListChecks,
  PackageOpen,
} from "lucide-react";

import { ehMestreOuChefe, exigirMembro } from "@/lib/auth/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import {
  assinarCaminhos,
  BUCKET_AVATARES,
  BUCKET_OFERTAS,
} from "@/lib/storage";
import { formatarDataPorExtenso, hojeISO, rotuloDePrazo } from "@/lib/data";
import {
  ChecklistMontagem,
  type EtapaDaChecklist,
  type MembroLeve,
} from "@/components/oferta/checklist-montagem";
import { SeloStatus } from "@/components/oferta/selo-status";
import { Badge } from "@/components/ui/badge";
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
  type ItemDaLista = {
    chave: string;
    titulo: string;
    origem: "etapa" | "tarefa";
    contexto: { id: string; nome: string } | null;
    data: string | null;
    alta: boolean;
  };

  const itens: ItemDaLista[] = [
    ...(
      (minhasEtapas ?? []) as unknown as {
        oferta_etapas: {
          id: string;
          titulo: string;
          ofertas: { id: string; nome: string; data_prevista: string | null };
        };
      }[]
    ).map(({ oferta_etapas: e }) => ({
      chave: `etapa-${e.id}`,
      titulo: e.titulo,
      origem: "etapa" as const,
      contexto: { id: e.ofertas.id, nome: e.ofertas.nome },
      data: e.ofertas.data_prevista,
      alta: false,
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
      titulo: t.titulo,
      origem: "tarefa" as const,
      contexto: t.ofertas,
      data: t.prazo,
      alta: t.prioridade === "ALTA",
    })),
  ].sort((a, b) => (a.data ?? "").localeCompare(b.data ?? ""));

  const primeiroNome = membro.nome.split(" ")[0];
  const capaUrl = oferta?.capa_path
    ? (capas.get(oferta.capa_path) ?? null)
    : null;

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <p className="text-muted-foreground text-sm">
          {formatarDataPorExtenso(hoje)}
        </p>
        <h1 className="text-2xl">Oi, {primeiroNome}</h1>
      </header>

      <section aria-labelledby="titulo-oferta-hoje" className="space-y-4">
        <h2
          id="titulo-oferta-hoje"
          className="text-muted-foreground text-xs font-medium tracking-wide uppercase"
        >
          Oferta de hoje
        </h2>

        {oferta ? (
          <>
            <Card className="overflow-hidden pt-0 sm:flex-row sm:gap-0 sm:py-0">
              <div className="bg-muted relative aspect-video w-full shrink-0 overflow-hidden sm:aspect-square sm:w-44">
                {capaUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- URL assinada e efêmera do Storage privado
                  <img
                    src={capaUrl}
                    alt={`Capa da oferta ${oferta.nome}`}
                    className="absolute inset-0 size-full object-cover"
                  />
                ) : (
                  <ImageOff
                    className="text-muted-foreground absolute inset-0 m-auto size-6"
                    aria-hidden="true"
                  />
                )}
              </div>

              <CardContent className="flex-1 space-y-2 py-6">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg">{oferta.nome}</h3>
                  <SeloStatus status={oferta.status} />
                </div>

                <p className="text-muted-foreground text-sm leading-relaxed">
                  {oferta.descricao}
                </p>

                <div className="text-muted-foreground flex flex-wrap items-center gap-3 pt-1 text-xs">
                  {oferta.rodadas ? (
                    <Link
                      href={`/rodadas/${oferta.rodadas.id}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {oferta.rodadas.nome}
                    </Link>
                  ) : null}
                  {oferta.anunciante_referencia ? (
                    <span>Referência: {oferta.anunciante_referencia}</span>
                  ) : null}
                  {oferta.url_referencia ? (
                    <a
                      href={oferta.url_referencia}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 underline-offset-4 hover:underline"
                    >
                      Ver anúncio
                      <ExternalLink className="size-3" aria-hidden="true" />
                    </a>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            <ChecklistMontagem
              ofertaId={oferta.id}
              etapasIniciais={etapas}
              equipe={equipe}
              podeDelegar={podeDelegar}
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

      <section aria-labelledby="titulo-minhas-tarefas" className="space-y-3">
        <h2
          id="titulo-minhas-tarefas"
          className="text-muted-foreground text-xs font-medium tracking-wide uppercase"
        >
          Minhas tarefas
        </h2>

        {itens.length === 0 ? (
          <EstadoVazio
            icone={ListChecks}
            titulo="Nada aberto no seu nome"
            descricao="Etapas de oferta e tarefas designadas a você aparecem aqui, juntas e ordenadas por data."
          />
        ) : (
          <ul className="divide-y rounded-lg border">
            {itens.map((item) => (
              <li
                key={item.chave}
                className="flex flex-wrap items-center gap-3 px-4 py-3"
              >
                <span className="min-w-0 flex-1 text-sm">{item.titulo}</span>

                {/* A origem é dita em palavra, não em cor: quem não distingue
                    as cores precisa saber se é etapa ou tarefa. */}
                <Badge variant="outline" className="font-normal">
                  {item.origem}
                </Badge>

                {item.contexto ? (
                  <Link
                    href={`/ofertas/${item.contexto.id}`}
                    className="text-muted-foreground max-w-40 truncate text-xs underline-offset-4 hover:underline"
                  >
                    {item.contexto.nome}
                  </Link>
                ) : null}

                {item.alta ? (
                  <Badge
                    variant="outline"
                    className="border-[color:var(--status-atrasada)] text-[color:var(--status-atrasada)]"
                  >
                    Alta
                  </Badge>
                ) : null}

                {item.data ? (
                  <Badge variant="secondary" className="tabular">
                    {rotuloDePrazo(item.data)}
                  </Badge>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
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
