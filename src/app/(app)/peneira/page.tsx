import { Suspense } from "react";
import type { Metadata } from "next";
import { Filter } from "lucide-react";

import { ehMestreOuChefe, exigirMembro } from "@/lib/auth/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { assinarCaminhos, BUCKET_AVATARES, BUCKET_OFERTAS } from "@/lib/storage";
import { DialogoIdeia } from "@/components/oferta/dialogo-ideia";
import {
  CartaoIdeia,
  type IdeiaDaGrade,
} from "@/components/oferta/cartao-ideia";
import {
  FiltrosPeneira,
  type EstadoPeneira,
} from "@/components/oferta/filtros-peneira";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { OfertaStatus } from "@/lib/dominio/tipos";

export const metadata: Metadata = { title: "Peneira de Ideias" };

/** Quais status cada opção de filtro mostra. */
const STATUS_POR_ESTADO: Record<EstadoPeneira, OfertaStatus[] | null> = {
  peneira: ["NA_PENEIRA"],
  escaladas: ["NA_ESTEIRA", "CONCLUIDA", "VALIDADA", "INVALIDADA"],
  descartadas: ["DESCARTADA"],
  todas: null,
};

type LinhaOferta = {
  id: string;
  nome: string;
  descricao: string;
  anunciante_referencia: string | null;
  url_referencia: string | null;
  nicho: string | null;
  capa_path: string | null;
  status: OfertaStatus;
  criada_em: string;
  criada_por: string | null;
  motivo_descarte: string | null;
  membros: { nome: string; foto_path: string | null } | null;
};

export default async function PaginaPeneira({
  searchParams,
}: PageProps<"/peneira">) {
  const membro = await exigirMembro();
  const parametros = await searchParams;
  const supabase = await criarClienteServidor();

  const primeiro = (v: string | string[] | undefined) =>
    Array.isArray(v) ? v[0] : v;

  const estado = (primeiro(parametros.estado) ?? "peneira") as EstadoPeneira;
  const busca = primeiro(parametros.q)?.trim();
  const autorId = primeiro(parametros.autor);
  const nicho = primeiro(parametros.nicho);

  let consulta = supabase
    .from("ofertas")
    .select(
      "id, nome, descricao, anunciante_referencia, url_referencia, nicho, capa_path, status, criada_em, criada_por, motivo_descarte, membros!ofertas_criada_por_fkey(nome, foto_path)",
    )
    .order("criada_em", { ascending: false });

  const statusVisiveis = STATUS_POR_ESTADO[estado] ?? null;
  if (statusVisiveis) consulta = consulta.in("status", statusVisiveis);
  if (busca) consulta = consulta.ilike("nome", `%${busca}%`);
  if (autorId) consulta = consulta.eq("criada_por", autorId);
  if (nicho) consulta = consulta.eq("nicho", nicho);

  // As opções dos filtros não dependem do resultado da busca, então não há
  // motivo para esperá-la. Três consultas em paralelo custam o tempo da mais
  // lenta, não a soma das três.
  const [
    { data, error },
    { data: autores },
    { data: nichosBrutos },
  ] = await Promise.all([
    consulta,
    supabase.from("membros").select("id, nome").eq("ativo", true).order("nome"),
    supabase.from("ofertas").select("nicho").not("nicho", "is", null),
  ]);

  const linhas = (data ?? []) as unknown as LinhaOferta[];

  // Duas assinaturas em lote, uma por bucket, em vez de uma por card.
  const [capas, avatares] = await Promise.all([
    assinarCaminhos(BUCKET_OFERTAS, linhas.map((l) => l.capa_path)),
    assinarCaminhos(BUCKET_AVATARES, linhas.map((l) => l.membros?.foto_path)),
  ]);

  const ideias: (IdeiaDaGrade & { souAutor: boolean })[] = linhas.map((l) => ({
    souAutor: l.criada_por === membro.id,
    id: l.id,
    nome: l.nome,
    descricao: l.descricao,
    anuncianteReferencia: l.anunciante_referencia,
    urlReferencia: l.url_referencia,
    nicho: l.nicho,
    capaUrl: l.capa_path ? (capas.get(l.capa_path) ?? null) : null,
    status: l.status,
    criadaEm: l.criada_em,
    motivoDescarte: l.motivo_descarte,
    autor: l.membros
      ? {
          nome: l.membros.nome,
          fotoUrl: l.membros.foto_path
            ? (avatares.get(l.membros.foto_path) ?? null)
            : null,
        }
      : null,
  }));

  // Opções vêm da base inteira, não do resultado já filtrado — senão filtrar
  // por um autor faria os outros sumirem da lista.
  const nichos = [
    ...new Set((nichosBrutos ?? []).map((n) => n.nicho as string)),
  ].sort();

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl">Peneira de Ideias</h1>
          <p className="text-muted-foreground text-sm">
            Onde toda oferta começa. O que entra aqui alimenta as Rodadas.
          </p>
        </div>

        <DialogoIdeia />
      </header>

      <Suspense fallback={<Skeleton className="h-16 w-full" />}>
        <FiltrosPeneira autores={autores ?? []} nichos={nichos} />
      </Suspense>

      {error ? (
        <p role="alert" className="text-destructive text-sm">
          Não foi possível carregar a Peneira: {error.message}
        </p>
      ) : null}

      {ideias.length === 0 ? (
        <Card className="border-dashed shadow-none">
          <CardContent className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <Filter className="text-muted-foreground size-8" aria-hidden="true" />
            <div className="space-y-1">
              <p className="font-medium">
                {estado === "peneira"
                  ? "A Peneira está vazia"
                  : "Nada aqui com esses filtros"}
              </p>
              <p className="text-muted-foreground mx-auto max-w-md text-sm leading-relaxed">
                {estado === "peneira"
                  ? "Cadastre a primeira ideia. Ela vira oferta no momento em que entrar numa Rodada, carregando tudo que você escrever agora."
                  : "Ajuste a busca ou troque o estado para ver outras ofertas."}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {ideias.map((ideia) => (
            <li key={ideia.id}>
              {/* RF-02.4: o autor mexe na própria ideia; Chefe e Mestre, em qualquer uma. */}
              <CartaoIdeia
                ideia={ideia}
                podeMexer={ideia.souAutor || ehMestreOuChefe(membro)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
