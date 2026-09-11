import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ImageOff } from "lucide-react";

import { ehMestreOuChefe, exigirMembro } from "@/lib/auth/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import {
  assinarCaminhos,
  BUCKET_AVATARES,
  BUCKET_OFERTAS,
} from "@/lib/storage";
import { formatarDataPorExtenso } from "@/lib/data";
import { AvatarMembro } from "@/components/equipe/avatar-membro";
import { SeloStatus } from "@/components/oferta/selo-status";
import {
  BotaoCancelarRodada,
  BotaoRemoverOferta,
} from "@/components/rodada/acoes-rodada";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  estaAtrasada,
  RODADA_STATUS_LABEL,
  type OfertaStatus,
  type RodadaStatus,
} from "@/lib/dominio/tipos";

export const metadata: Metadata = { title: "Rodada" };

type LinhaOferta = {
  id: string;
  nome: string;
  status: OfertaStatus;
  data_prevista: string | null;
  ordem_na_rodada: number | null;
  capa_path: string | null;
  roteiros: { nome: string } | null;
  oferta_etapas: {
    concluida: boolean;
    oferta_etapa_responsaveis: {
      membros: { id: string; nome: string; foto_path: string | null } | null;
    }[];
  }[];
};

export default async function PaginaRodada({
  params,
}: PageProps<"/rodadas/[id]">) {
  const membro = await exigirMembro();
  const podeGerir = ehMestreOuChefe(membro);
  const { id } = await params;

  const supabase = await criarClienteServidor();

  const { data: rodada } = await supabase
    .from("rodadas")
    .select("id, nome, data_inicio, observacoes, status")
    .eq("id", id)
    .maybeSingle();

  if (!rodada) notFound();

  const { data: ofertasBrutas } = await supabase
    .from("ofertas")
    .select(
      "id, nome, status, data_prevista, ordem_na_rodada, capa_path, roteiros(nome), oferta_etapas(concluida, oferta_etapa_responsaveis(membros(id, nome, foto_path)))",
    )
    .eq("rodada_id", id)
    .order("ordem_na_rodada");

  const linhas = (ofertasBrutas ?? []) as unknown as LinhaOferta[];

  const caminhosDeFoto = linhas.flatMap((l) =>
    l.oferta_etapas.flatMap((e) =>
      e.oferta_etapa_responsaveis.map((r) => r.membros?.foto_path),
    ),
  );

  // Duas assinaturas em lote, uma por bucket — não uma por avatar na tela.
  const [capas, avatares] = await Promise.all([
    assinarCaminhos(BUCKET_OFERTAS, linhas.map((l) => l.capa_path)),
    assinarCaminhos(BUCKET_AVATARES, caminhosDeFoto),
  ]);

  const agora = new Date();
  const naEsteira = linhas.filter((l) => l.status === "NA_ESTEIRA").length;
  const fechadas = linhas.length - naEsteira;

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/rodadas">
            <ArrowLeft aria-hidden="true" />
            Rodadas
          </Link>
        </Button>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl">{rodada.nome}</h1>
            <Badge variant="secondary">
              {RODADA_STATUS_LABEL[rodada.status as RodadaStatus]}
            </Badge>
          </div>
          {rodada.observacoes ? (
            <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed">
              {rodada.observacoes}
            </p>
          ) : null}
          <p className="text-muted-foreground text-sm tabular">
            {fechadas} de {linhas.length} montada
            {linhas.length === 1 ? "" : "s"}
          </p>
        </div>

        {podeGerir && rodada.status === "EM_ANDAMENTO" ? (
          <BotaoCancelarRodada
            rodadaId={rodada.id}
            nome={rodada.nome}
            quantidade={naEsteira}
          />
        ) : null}
      </header>

      <ol className="space-y-3">
        {linhas.map((oferta) => {
          const total = oferta.oferta_etapas.length;
          const concluidas = oferta.oferta_etapas.filter(
            (e) => e.concluida,
          ).length;
          const temEtapaConcluida = concluidas > 0;
          const atrasada = estaAtrasada(
            oferta.status,
            oferta.data_prevista,
            agora,
          );

          // Cada pessoa aparece uma vez, mesmo sendo dona de várias etapas.
          const responsaveis = new Map<
            string,
            { nome: string; fotoPath: string | null }
          >();
          for (const etapa of oferta.oferta_etapas) {
            for (const r of etapa.oferta_etapa_responsaveis) {
              if (r.membros) {
                responsaveis.set(r.membros.id, {
                  nome: r.membros.nome,
                  fotoPath: r.membros.foto_path,
                });
              }
            }
          }

          return (
            <li key={oferta.id}>
              <Card>
                <CardContent className="flex flex-wrap items-center gap-4">
                  <span className="text-muted-foreground w-5 shrink-0 font-mono text-sm tabular">
                    {oferta.ordem_na_rodada}
                  </span>

                  <div className="bg-muted relative size-14 shrink-0 overflow-hidden rounded">
                    {oferta.capa_path && capas.get(oferta.capa_path) ? (
                      // eslint-disable-next-line @next/next/no-img-element -- URL assinada e efêmera do Storage privado
                      <img
                        src={capas.get(oferta.capa_path)}
                        alt=""
                        className="absolute inset-0 size-full object-cover"
                      />
                    ) : (
                      <ImageOff
                        className="text-muted-foreground absolute inset-0 m-auto size-4"
                        aria-hidden="true"
                      />
                    )}
                  </div>

                  <div className="min-w-48 flex-1 space-y-1">
                    <Link
                      href={`/ofertas/${oferta.id}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {oferta.nome}
                    </Link>
                    <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
                      <time dateTime={oferta.data_prevista ?? ""} className="tabular">
                        {oferta.data_prevista
                          ? formatarDataPorExtenso(oferta.data_prevista)
                          : "sem data"}
                      </time>
                      {oferta.roteiros ? (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{oferta.roteiros.nome}</span>
                        </>
                      ) : null}
                      {atrasada ? (
                        <Badge
                          variant="outline"
                          className="border-[color:var(--status-atrasada)] text-[color:var(--status-atrasada)]"
                        >
                          Atrasada
                        </Badge>
                      ) : null}
                    </div>
                  </div>

                  <div className="w-32 space-y-1">
                    <Progress
                      value={total > 0 ? (concluidas / total) * 100 : 0}
                    />
                    <p className="text-muted-foreground text-xs tabular">
                      {concluidas}/{total} etapas
                    </p>
                  </div>

                  <div className="flex -space-x-2">
                    {[...responsaveis.values()].slice(0, 4).map((r) => (
                      <AvatarMembro
                        key={r.nome}
                        nome={r.nome}
                        fotoUrl={
                          r.fotoPath ? (avatares.get(r.fotoPath) ?? null) : null
                        }
                        tamanho="xs"
                        className="ring-background ring-2"
                      />
                    ))}
                  </div>

                  <SeloStatus status={oferta.status} />

                  {podeGerir && oferta.status === "NA_ESTEIRA" ? (
                    <BotaoRemoverOferta
                      rodadaId={rodada.id}
                      ofertaId={oferta.id}
                      nomeOferta={oferta.nome}
                      temEtapaConcluida={temEtapaConcluida}
                    />
                  ) : null}
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
