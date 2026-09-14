import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Download, ImageOff, Package } from "lucide-react";

import { exigirMembro } from "@/lib/auth/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import {
  assinarCaminhos,
  BUCKET_AVATARES,
  BUCKET_OFERTAS,
} from "@/lib/storage";
import { formatarData } from "@/lib/data";
import { AvatarMembro } from "@/components/equipe/avatar-membro";
import { FiltrosOfertas } from "@/components/oferta/filtros-ofertas";
import { SeloStatus } from "@/components/oferta/selo-status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  estaAtrasada,
  OFERTA_STATUS,
  type OfertaStatus,
} from "@/lib/dominio/tipos";

export const metadata: Metadata = { title: "Ofertas" };

type LinhaOferta = {
  id: string;
  nome: string;
  status: OfertaStatus;
  nicho: string | null;
  capa_path: string | null;
  criada_em: string;
  data_prevista: string | null;
  data_conclusao: string | null;
  data_validacao: string | null;
  rodadas: { id: string; nome: string } | null;
  membros: { nome: string; foto_path: string | null } | null;
  oferta_etapas: { concluida: boolean }[];
};

export default async function PaginaOfertas({
  searchParams,
}: PageProps<"/ofertas">) {
  await exigirMembro();
  const supabase = await criarClienteServidor();

  const parametros = await searchParams;
  const primeiro = (v: string | string[] | undefined) =>
    Array.isArray(v) ? v[0] : v;

  const status = primeiro(parametros.status);
  const rodadaId = primeiro(parametros.rodada);
  const autorId = primeiro(parametros.autor);
  const de = primeiro(parametros.de);
  const ate = primeiro(parametros.ate);
  const campoData = primeiro(parametros.campo) ?? "criada_em";

  let consulta = supabase
    .from("ofertas")
    .select(
      "id, nome, status, nicho, capa_path, criada_em, data_prevista, data_conclusao, data_validacao, rodadas(id, nome), membros!ofertas_criada_por_fkey(nome, foto_path), oferta_etapas(concluida)",
    )
    .order("criada_em", { ascending: false });

  if (status && OFERTA_STATUS.includes(status as OfertaStatus)) {
    consulta = consulta.eq("status", status);
  }
  if (rodadaId) consulta = consulta.eq("rodada_id", rodadaId);
  if (autorId) consulta = consulta.eq("criada_por", autorId);
  if (de) consulta = consulta.gte(campoData, de);
  if (ate) consulta = consulta.lte(campoData, `${ate}T23:59:59`);

  const [{ data, error }, { data: rodadas }, { data: autores }, { count }] =
    await Promise.all([
      consulta,
      supabase
        .from("rodadas")
        .select("id, nome")
        .order("data_inicio", { ascending: false }),
      supabase.from("membros").select("id, nome").order("nome"),
      supabase.from("ofertas").select("*", { count: "exact", head: true }),
    ]);

  const linhas = (data ?? []) as unknown as LinhaOferta[];

  const [capas, avatares] = await Promise.all([
    assinarCaminhos(BUCKET_OFERTAS, linhas.map((l) => l.capa_path)),
    assinarCaminhos(BUCKET_AVATARES, linhas.map((l) => l.membros?.foto_path)),
  ]);

  const agora = new Date();
  const consultaAtual = new URLSearchParams(
    Object.entries(parametros).flatMap(([chave, valor]) =>
      valor === undefined
        ? []
        : [[chave, Array.isArray(valor) ? valor[0] : valor] as [string, string]],
    ),
  ).toString();

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl">Ofertas</h1>
          <p className="text-muted-foreground text-sm tabular">
            {linhas.length} de {count ?? 0} no total
          </p>
        </div>

        <Button asChild variant="secondary">
          <a
            href={`/ofertas/exportar${consultaAtual ? `?${consultaAtual}` : ""}`}
          >
            <Download aria-hidden="true" />
            Exportar CSV
          </a>
        </Button>
      </header>

      <Suspense fallback={<Skeleton className="h-24 w-full" />}>
        <FiltrosOfertas rodadas={rodadas ?? []} autores={autores ?? []} />
      </Suspense>

      {error ? (
        <p role="alert" className="text-destructive text-sm">
          Não foi possível carregar as ofertas: {error.message}
        </p>
      ) : null}

      {linhas.length === 0 ? (
        <Card className="border-dashed shadow-none">
          <CardContent className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <Package className="text-muted-foreground size-8" aria-hidden="true" />
            <div className="space-y-1">
              <p className="font-medium">Nada com esses filtros</p>
              <p className="text-muted-foreground mx-auto max-w-md text-sm leading-relaxed">
                Ajuste o status ou o período para ver outras ofertas.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-2">
          {linhas.map((oferta) => {
            const total = oferta.oferta_etapas.length;
            const concluidas = oferta.oferta_etapas.filter(
              (e) => e.concluida,
            ).length;
            const atrasada = estaAtrasada(
              oferta.status,
              oferta.data_prevista,
              agora,
            );

            return (
              <li key={oferta.id}>
                <Card>
                  <CardContent className="flex flex-wrap items-center gap-4">
                    <div className="bg-muted relative size-12 shrink-0 overflow-hidden rounded">
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
                        {oferta.membros ? (
                          <span className="flex items-center gap-1">
                            <AvatarMembro
                              nome={oferta.membros.nome}
                              fotoUrl={
                                oferta.membros.foto_path
                                  ? (avatares.get(oferta.membros.foto_path) ??
                                    null)
                                  : null
                              }
                              tamanho="xs"
                            />
                            {oferta.membros.nome}
                          </span>
                        ) : null}
                        {oferta.rodadas ? (
                          <>
                            <span aria-hidden="true">·</span>
                            <Link
                              href={`/rodadas/${oferta.rodadas.id}`}
                              className="underline-offset-4 hover:underline"
                            >
                              {oferta.rodadas.nome}
                            </Link>
                          </>
                        ) : null}
                        {oferta.nicho ? (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>{oferta.nicho}</span>
                          </>
                        ) : null}
                      </div>
                    </div>

                    {total > 0 ? (
                      <div className="w-28 space-y-1">
                        <Progress value={(concluidas / total) * 100} />
                        <p className="text-muted-foreground text-xs tabular">
                          {concluidas}/{total}
                        </p>
                      </div>
                    ) : null}

                    <div className="text-muted-foreground w-28 text-xs tabular">
                      {oferta.data_validacao
                        ? `validada ${formatarData(oferta.data_validacao)}`
                        : oferta.data_conclusao
                          ? `montada ${formatarData(oferta.data_conclusao)}`
                          : oferta.data_prevista
                            ? formatarData(oferta.data_prevista)
                            : formatarData(oferta.criada_em)}
                    </div>

                    <div className="flex items-center gap-2">
                      {atrasada ? (
                        <Badge
                          variant="outline"
                          className="border-[color:var(--status-atrasada)] text-[color:var(--status-atrasada)]"
                        >
                          Atrasada
                        </Badge>
                      ) : null}
                      <SeloStatus status={oferta.status} />
                    </div>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
