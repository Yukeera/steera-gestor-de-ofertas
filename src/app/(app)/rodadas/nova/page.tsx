import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { ehMestreOuChefe, exigirMembro } from "@/lib/auth/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { assinarCaminhos, BUCKET_OFERTAS } from "@/lib/storage";
import { hojeISO } from "@/lib/data";
import {
  AssistenteRodada,
  type OfertaDisponivel,
  type RoteiroDisponivel,
} from "@/components/rodada/assistente-rodada";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Nova Rodada" };

export default async function PaginaNovaRodada() {
  const membro = await exigirMembro();
  if (!ehMestreOuChefe(membro)) redirect("/rodadas");

  const supabase = await criarClienteServidor();
  const hoje = hojeISO();

  const [
    { data: ofertasBrutas },
    { data: roteirosBrutos },
    { data: feriadosBrutos },
    { count: rodadasExistentes },
  ] = await Promise.all([
    // RN-01: só entra em Rodada o que está na Peneira.
    supabase
      .from("ofertas")
      .select("id, nome, descricao, nicho, capa_path")
      .eq("status", "NA_PENEIRA")
      .order("criada_em", { ascending: false }),
    supabase
      .from("roteiros")
      .select("id, nome, e_padrao, roteiro_etapas(count)")
      .eq("arquivado", false)
      .order("e_padrao", { ascending: false })
      .order("nome"),
    // Só os feriados daqui para a frente interessam ao cronograma.
    supabase.from("feriados").select("data").gte("data", hoje),
    supabase.from("rodadas").select("*", { count: "exact", head: true }),
  ]);

  const linhas = ofertasBrutas ?? [];
  const capas = await assinarCaminhos(
    BUCKET_OFERTAS,
    linhas.map((l) => l.capa_path),
  );

  const ofertas: OfertaDisponivel[] = linhas.map((l) => ({
    id: l.id,
    nome: l.nome,
    descricao: l.descricao,
    nicho: l.nicho,
    capaUrl: l.capa_path ? (capas.get(l.capa_path) ?? null) : null,
  }));

  const roteiros: RoteiroDisponivel[] = (
    (roteirosBrutos ?? []) as unknown as {
      id: string;
      nome: string;
      e_padrao: boolean;
      roteiro_etapas: { count: number }[];
    }[]
  ).map((r) => ({
    id: r.id,
    nome: r.nome,
    ePadrao: r.e_padrao,
    quantidadeEtapas: r.roteiro_etapas?.[0]?.count ?? 0,
  }));

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

      <header className="space-y-1">
        <h1 className="text-2xl">Nova Rodada</h1>
        <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed">
          Escolha o que sai da Peneira e em que ordem. O Steera distribui uma
          oferta por dia útil e copia o roteiro para dentro de cada uma.
        </p>
      </header>

      <AssistenteRodada
        ofertasDisponiveis={ofertas}
        roteiros={roteiros}
        feriados={(feriadosBrutos ?? []).map((f) => f.data as string)}
        nomeSugerido={`Rodada #${(rodadasExistentes ?? 0) + 1}`}
        dataSugerida={hoje}
      />
    </div>
  );
}
