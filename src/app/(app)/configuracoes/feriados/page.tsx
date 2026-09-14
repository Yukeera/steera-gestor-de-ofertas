import type { Metadata } from "next";

import { ehChefe, exigirMembro } from "@/lib/auth/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import {
  GestaoDeFeriados,
  type Feriado,
} from "@/components/configuracao/gestao-de-feriados";

export const metadata: Metadata = { title: "Feriados" };

export default async function PaginaFeriados() {
  const membro = await exigirMembro();
  const supabase = await criarClienteServidor();

  const { data } = await supabase
    .from("feriados")
    .select("data, descricao")
    .order("data");

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed">
        Dias em que a equipe não monta oferta. Ao montar uma Rodada, a esteira
        pula esta lista junto com sábados e domingos — e o calendário recusa
        soltar um card aqui.
      </p>

      <GestaoDeFeriados
        feriados={(data ?? []) as Feriado[]}
        podeEditar={ehChefe(membro)}
      />
    </div>
  );
}
