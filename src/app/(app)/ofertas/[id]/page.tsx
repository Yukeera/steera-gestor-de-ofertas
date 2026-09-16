import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, ImageOff } from "lucide-react";

import { ehMestreOuChefe, exigirMembro } from "@/lib/auth/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import {
  assinarCaminhos,
  BUCKET_AVATARES,
  BUCKET_OFERTAS,
} from "@/lib/storage";
import { formatarData, formatarDataPorExtenso } from "@/lib/data";
import {
  ChecklistMontagem,
  type EtapaDaChecklist,
  type MembroLeve,
} from "@/components/oferta/checklist-montagem";
import { BlocoValidacao } from "@/components/oferta/bloco-validacao";
import { CampoWhatsapp } from "@/components/oferta/campo-whatsapp";
import {
  HistoricoOferta,
  type EventoDaOferta,
} from "@/components/oferta/historico-oferta";
import { SeloStatus } from "@/components/oferta/selo-status";
import { AvatarMembro } from "@/components/equipe/avatar-membro";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { OfertaStatus } from "@/lib/dominio/tipos";

export const metadata: Metadata = { title: "Oferta" };

/** Endereço inteiro não cabe na coluna lateral; o domínio já identifica. */
function dominioDe(link: string): string {
  try {
    const { hostname, search } = new URL(link);
    return `${hostname.replace(/^www\./, "")}${search}`;
  } catch {
    return link;
  }
}

type LinhaOferta = {
  id: string;
  nome: string;
  descricao: string;
  anunciante_referencia: string | null;
  url_referencia: string | null;
  nicho: string | null;
  capa_path: string | null;
  whatsapp_funil: string | null;
  status: OfertaStatus;
  criada_em: string;
  data_prevista: string | null;
  escalada_em: string | null;
  data_conclusao: string | null;
  data_validacao: string | null;
  observacao_validacao: string | null;
  motivo_descarte: string | null;
  rodadas: { id: string; nome: string } | null;
  roteiros: { nome: string } | null;
  membros: { nome: string; foto_path: string | null } | null;
  oferta_anexos: { id: string; url: string | null }[];
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

export default async function PaginaOferta({
  params,
}: PageProps<"/ofertas/[id]">) {
  const membro = await exigirMembro();
  const podeGerir = ehMestreOuChefe(membro);
  const { id } = await params;

  const supabase = await criarClienteServidor();

  const [{ data: bruta }, { data: equipeBruta }, { data: eventosBrutos }] =
    await Promise.all([
      supabase
        .from("ofertas")
        .select(
          "id, nome, descricao, anunciante_referencia, url_referencia, nicho, capa_path, whatsapp_funil, status, criada_em, data_prevista, escalada_em, data_conclusao, data_validacao, observacao_validacao, motivo_descarte, rodadas(id, nome), roteiros(nome), membros!ofertas_criada_por_fkey(nome, foto_path), oferta_anexos(id, url), oferta_etapas(id, ordem, titulo, descricao, concluida, oferta_etapa_responsaveis(membros(id, nome, foto_path)))",
        )
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("membros")
        .select("id, nome, foto_path")
        .eq("ativo", true)
        .order("nome"),
      supabase
        .from("oferta_eventos")
        .select("id, tipo, detalhe, ocorrido_em, membros(nome)")
        .eq("oferta_id", id)
        .order("ocorrido_em", { ascending: false }),
    ]);

  if (!bruta) notFound();
  const oferta = bruta as unknown as LinhaOferta;

  const [capas, avatares] = await Promise.all([
    assinarCaminhos(BUCKET_OFERTAS, [oferta.capa_path]),
    assinarCaminhos(BUCKET_AVATARES, [
      ...(equipeBruta ?? []).map((m) => m.foto_path),
      oferta.membros?.foto_path,
      ...oferta.oferta_etapas.flatMap((e) =>
        e.oferta_etapa_responsaveis.map((r) => r.membros?.foto_path),
      ),
    ]),
  ]);

  const url = (caminho: string | null | undefined) =>
    caminho ? (avatares.get(caminho) ?? null) : null;

  const equipe: MembroLeve[] = (equipeBruta ?? []).map((m) => ({
    id: m.id,
    nome: m.nome,
    fotoUrl: url(m.foto_path),
  }));

  // Anexo também pode ser arquivo no Storage, e aí `url` vem nula.
  const criativos = oferta.oferta_anexos
    .map((a) => a.url)
    .filter((url): url is string => url !== null);

  const etapas: EtapaDaChecklist[] = [...oferta.oferta_etapas]
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
          fotoUrl: url(r.membros!.foto_path),
        })),
    }));

  const eventos: EventoDaOferta[] = (
    (eventosBrutos ?? []) as unknown as {
      id: string;
      tipo: string;
      detalhe: Record<string, unknown>;
      ocorrido_em: string;
      membros: { nome: string } | null;
    }[]
  ).map((e) => ({
    id: e.id,
    tipo: e.tipo,
    detalhe: e.detalhe ?? {},
    ocorridoEm: e.ocorrido_em,
    autor: e.membros?.nome ?? null,
  }));

  const capaUrl = oferta.capa_path
    ? (capas.get(oferta.capa_path) ?? null)
    : null;

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/ofertas">
            <ArrowLeft aria-hidden="true" />
            Ofertas
          </Link>
        </Button>
      </div>

      <header className="flex flex-wrap items-start gap-4">
        <div className="bg-muted relative size-24 shrink-0 overflow-hidden rounded-lg">
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

        <div className="min-w-64 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl">{oferta.nome}</h1>
            <SeloStatus status={oferta.status} />
          </div>

          <p className="text-muted-foreground text-sm leading-relaxed">
            {oferta.descricao}
          </p>

          <div className="text-muted-foreground flex flex-wrap items-center gap-3 text-xs">
            {oferta.membros ? (
              <span className="flex items-center gap-1.5">
                <AvatarMembro
                  nome={oferta.membros.nome}
                  fotoUrl={url(oferta.membros.foto_path)}
                  tamanho="xs"
                />
                {oferta.membros.nome}
              </span>
            ) : null}
            <span className="tabular">
              cadastrada em {formatarData(oferta.criada_em)}
            </span>
            {oferta.nicho ? <Badge variant="outline">{oferta.nicho}</Badge> : null}
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-8">
          <section aria-labelledby="t-origem" className="space-y-3">
            <h2
              id="t-origem"
              className="text-muted-foreground text-xs font-medium tracking-wide uppercase"
            >
              Origem
            </h2>
            <Card>
              <CardContent className="space-y-3 text-sm">
                <Campo rotulo="Anunciante de referência">
                  {oferta.anunciante_referencia ?? "—"}
                </Campo>
                <Separator />
                <Campo rotulo="Link da referência">
                  {oferta.url_referencia ? (
                    <a
                      href={oferta.url_referencia}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 underline underline-offset-4"
                    >
                      Ver anúncio
                      <ExternalLink className="size-3" aria-hidden="true" />
                    </a>
                  ) : (
                    "—"
                  )}
                </Campo>
                {criativos.length > 0 ? (
                  <>
                    <Separator />
                    <Campo rotulo="Criativos de referência">
                      <ul className="space-y-1">
                        {criativos.map((link) => (
                          <li key={link}>
                            <a
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex max-w-full items-center gap-1 underline underline-offset-4"
                            >
                              <span className="truncate">
                                {dominioDe(link)}
                              </span>
                              <ExternalLink
                                className="size-3 shrink-0"
                                aria-hidden="true"
                              />
                            </a>
                          </li>
                        ))}
                      </ul>
                    </Campo>
                  </>
                ) : null}
                {oferta.motivo_descarte ? (
                  <>
                    <Separator />
                    <Campo rotulo="Motivo do descarte">
                      {oferta.motivo_descarte}
                    </Campo>
                  </>
                ) : null}
              </CardContent>
            </Card>
          </section>

          <section aria-labelledby="t-funil" className="space-y-3">
            <h2
              id="t-funil"
              className="text-muted-foreground text-xs font-medium tracking-wide uppercase"
            >
              Funil
            </h2>
            <Card>
              <CardContent className="text-sm">
                <Campo rotulo="WhatsApp do funil">
                  <CampoWhatsapp
                    ofertaId={oferta.id}
                    numero={oferta.whatsapp_funil}
                  />
                </Campo>
              </CardContent>
            </Card>
          </section>

          <section aria-labelledby="t-montagem" className="space-y-3">
            <h2
              id="t-montagem"
              className="text-muted-foreground text-xs font-medium tracking-wide uppercase"
            >
              Montagem
            </h2>

            {etapas.length === 0 ? (
              <Card className="border-dashed shadow-none">
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Esta oferta ainda não entrou numa Rodada, então não tem
                    roteiro montado.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <ChecklistMontagem
                ofertaId={oferta.id}
                etapasIniciais={etapas}
                equipe={equipe}
                podeDelegar={podeGerir && oferta.status === "NA_ESTEIRA"}
                membroId={membro.id}
              />
            )}
          </section>

          <section aria-labelledby="t-resultado" className="space-y-3">
            <h2
              id="t-resultado"
              className="text-muted-foreground text-xs font-medium tracking-wide uppercase"
            >
              Resultado
            </h2>
            <BlocoValidacao
              ofertaId={oferta.id}
              status={oferta.status}
              dataValidacao={oferta.data_validacao}
              observacao={oferta.observacao_validacao}
              podeValidar={podeGerir}
            />
          </section>
        </div>

        <aside className="space-y-8">
          <section aria-labelledby="t-linha" className="space-y-3">
            <h2
              id="t-linha"
              className="text-muted-foreground text-xs font-medium tracking-wide uppercase"
            >
              Na esteira
            </h2>
            <Card>
              <CardContent className="space-y-3 text-sm">
                <Campo rotulo="Rodada">
                  {oferta.rodadas ? (
                    <Link
                      href={`/rodadas/${oferta.rodadas.id}`}
                      className="underline underline-offset-4"
                    >
                      {oferta.rodadas.nome}
                    </Link>
                  ) : (
                    "—"
                  )}
                </Campo>
                <Separator />
                <Campo rotulo="Roteiro">{oferta.roteiros?.nome ?? "—"}</Campo>
                <Separator />
                <Campo rotulo="Dia na esteira">
                  {oferta.data_prevista
                    ? formatarDataPorExtenso(oferta.data_prevista)
                    : "—"}
                </Campo>
                <Separator />
                <Campo rotulo="Montada em">
                  {oferta.data_conclusao
                    ? formatarData(oferta.data_conclusao)
                    : "—"}
                </Campo>
              </CardContent>
            </Card>
          </section>

          <section aria-labelledby="t-historico" className="space-y-3">
            <h2
              id="t-historico"
              className="text-muted-foreground text-xs font-medium tracking-wide uppercase"
            >
              Histórico
            </h2>
            <HistoricoOferta eventos={eventos} />
          </section>
        </aside>
      </div>
    </div>
  );
}

function Campo({
  rotulo,
  children,
}: {
  rotulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <span className="text-muted-foreground text-xs">{rotulo}</span>
      <span className="text-right">{children}</span>
    </div>
  );
}
