import type { Metadata } from "next";
import Link from "next/link";
import { Layers, Plus } from "lucide-react";

import { ehMestreOuChefe, exigirMembro } from "@/lib/auth/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { formatarData } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  RODADA_STATUS_LABEL,
  type OfertaStatus,
  type RodadaStatus,
} from "@/lib/dominio/tipos";

export const metadata: Metadata = { title: "Rodadas" };

type LinhaRodada = {
  id: string;
  nome: string;
  data_inicio: string;
  observacoes: string | null;
  status: RodadaStatus;
  ofertas: { status: OfertaStatus; data_prevista: string | null }[];
};

export default async function PaginaRodadas() {
  const membro = await exigirMembro();
  const podeMontar = ehMestreOuChefe(membro);
  const supabase = await criarClienteServidor();

  const { data, error } = await supabase
    .from("rodadas")
    .select("id, nome, data_inicio, observacoes, status, ofertas(status, data_prevista)")
    .order("data_inicio", { ascending: false });

  const rodadas = (data ?? []) as unknown as LinhaRodada[];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl">Rodadas</h1>
          <p className="text-muted-foreground text-sm">
            Cada Rodada é um lote de ofertas distribuído pelos dias úteis.
          </p>
        </div>

        {podeMontar ? (
          <Button asChild>
            <Link href="/rodadas/nova">
              <Plus aria-hidden="true" />
              Nova Rodada
            </Link>
          </Button>
        ) : null}
      </header>

      {error ? (
        <p role="alert" className="text-destructive text-sm">
          Não foi possível carregar as Rodadas: {error.message}
        </p>
      ) : null}

      {rodadas.length === 0 ? (
        <Card className="border-dashed shadow-none">
          <CardContent className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <Layers className="text-muted-foreground size-8" aria-hidden="true" />
            <div className="space-y-1">
              <p className="font-medium">Nenhuma Rodada ainda</p>
              <p className="text-muted-foreground mx-auto max-w-md text-sm leading-relaxed">
                {podeMontar
                  ? "Monte a primeira: escolha ofertas da Peneira e o Steera distribui uma por dia útil."
                  : "Assim que o Mestre da Esteira montar a primeira, ela aparece aqui."}
              </p>
            </div>
            {podeMontar ? (
              <Button asChild variant="secondary" size="sm" className="mt-1">
                <Link href="/rodadas/nova">Montar Rodada</Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {rodadas.map((rodada) => {
            const total = rodada.ofertas.length;
            const fechadas = rodada.ofertas.filter(
              (o) => o.status !== "NA_ESTEIRA" && o.status !== "NA_PENEIRA",
            ).length;
            const percentual = total > 0 ? (fechadas / total) * 100 : 0;

            const datas = rodada.ofertas
              .map((o) => o.data_prevista)
              .filter((d): d is string => Boolean(d))
              .sort();

            return (
              <li key={rodada.id}>
                <Card>
                  <CardContent className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 space-y-1">
                        <h2 className="leading-tight font-medium">
                          <Link
                            href={`/rodadas/${rodada.id}`}
                            className="underline-offset-4 hover:underline"
                          >
                            {rodada.nome}
                          </Link>
                        </h2>
                        {datas.length > 0 ? (
                          <p className="text-muted-foreground text-sm tabular">
                            {formatarData(datas[0])} a{" "}
                            {formatarData(datas[datas.length - 1])}
                          </p>
                        ) : null}
                      </div>

                      <Badge
                        variant={
                          rodada.status === "CONCLUIDA"
                            ? "default"
                            : rodada.status === "CANCELADA"
                              ? "outline"
                              : "secondary"
                        }
                        className="shrink-0"
                      >
                        {RODADA_STATUS_LABEL[rodada.status]}
                      </Badge>
                    </div>

                    {rodada.observacoes ? (
                      <p className="text-muted-foreground line-clamp-2 text-sm leading-relaxed">
                        {rodada.observacoes}
                      </p>
                    ) : null}

                    <div className="space-y-1.5">
                      <Progress value={percentual} />
                      <p className="text-muted-foreground text-xs tabular">
                        {fechadas} de {total} montada{total === 1 ? "" : "s"}
                      </p>
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
