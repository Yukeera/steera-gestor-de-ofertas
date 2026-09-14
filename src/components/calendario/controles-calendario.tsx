"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { deslocar, tituloDoPeriodo, type Periodo } from "@/lib/calendario";
import { OFERTA_STATUS_VISUAL, type OfertaStatus } from "@/lib/dominio/tipos";

const TODAS = "__todas__";

const STATUS_NA_LEGENDA: OfertaStatus[] = [
  "NA_ESTEIRA",
  "CONCLUIDA",
  "VALIDADA",
  "INVALIDADA",
];

export function ControlesCalendario({
  referencia,
  periodo,
  hoje,
  rodadas,
}: {
  referencia: string;
  periodo: Periodo;
  hoje: string;
  rodadas: { id: string; nome: string }[];
}) {
  const router = useRouter();
  const parametros = useSearchParams();

  function navegar(alteracoes: Record<string, string | null>) {
    const proximos = new URLSearchParams(parametros.toString());

    for (const [chave, valor] of Object.entries(alteracoes)) {
      if (!valor || valor === TODAS) proximos.delete(chave);
      else proximos.set(chave, valor);
    }

    const consulta = proximos.toString();
    router.replace(consulta ? `/calendario?${consulta}` : "/calendario");
  }

  function trocarPeriodo(novo: Periodo) {
    // Trocar mês↔semana precisa converter a referência: o mês usa `2026-09`,
    // a semana usa um dia. Sem isso a navegação pularia para lugar nenhum.
    const referenciaNova =
      novo === "semana"
        ? referencia.length === 7
          ? `${referencia}-01`
          : referencia
        : referencia.slice(0, 7);

    navegar({ vis: novo === "mes" ? null : novo, ref: referenciaNova });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <Button
            variant="secondary"
            size="icon"
            onClick={() => navegar({ ref: deslocar(referencia, periodo, -1) })}
          >
            <ChevronLeft aria-hidden="true" />
            <span className="sr-only">Período anterior</span>
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={() => navegar({ ref: deslocar(referencia, periodo, 1) })}
          >
            <ChevronRight aria-hidden="true" />
            <span className="sr-only">Próximo período</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              navegar({ ref: periodo === "mes" ? hoje.slice(0, 7) : hoje })
            }
          >
            Hoje
          </Button>
        </div>

        <h2 className="min-w-48 flex-1 text-lg">
          {tituloDoPeriodo(referencia, periodo)}
        </h2>

        <div className="flex items-center gap-1 rounded-md border p-0.5">
          {(["mes", "semana"] as const).map((opcao) => (
            <Button
              key={opcao}
              variant={periodo === opcao ? "secondary" : "ghost"}
              size="sm"
              aria-pressed={periodo === opcao}
              onClick={() => trocarPeriodo(opcao)}
            >
              {opcao === "mes" ? "Mês" : "Semana"}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Switch
            id="so-minhas"
            checked={parametros.get("minhas") === "1"}
            onCheckedChange={(v) => navegar({ minhas: v ? "1" : null })}
          />
          <Label htmlFor="so-minhas" className="text-sm font-normal">
            Só o que é meu
          </Label>
        </div>

        <div className="flex items-center gap-2">
          <Switch
            id="ver-tarefas"
            checked={parametros.get("tarefas") !== "0"}
            onCheckedChange={(v) => navegar({ tarefas: v ? null : "0" })}
          />
          <Label htmlFor="ver-tarefas" className="text-sm font-normal">
            Mostrar tarefas
          </Label>
        </div>

        {rodadas.length > 0 ? (
          <div className="flex items-center gap-2">
            <Label htmlFor="rodada" className="text-sm font-normal">
              Rodada
            </Label>
            <Select
              value={parametros.get("rodada") ?? TODAS}
              onValueChange={(v) => navegar({ rodada: v })}
            >
              <SelectTrigger id="rodada" className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TODAS}>Todas</SelectItem>
                {rodadas.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>

      {/* `legend-visible`: a cor da borda do card só significa algo com a
          legenda por perto. */}
      <ul className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {STATUS_NA_LEGENDA.map((status) => (
          <li key={status} className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="h-3 w-1 rounded-full"
              style={{ background: OFERTA_STATUS_VISUAL[status].token }}
            />
            {OFERTA_STATUS_VISUAL[status].label}
          </li>
        ))}
        <li className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="h-3 w-1 rounded-full"
            style={{ background: "var(--status-atrasada)" }}
          />
          Atrasada
        </li>
        <li className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="border-muted-foreground/50 h-3 w-3 rounded-sm border border-dashed"
          />
          Tarefa
        </li>
      </ul>
    </div>
  );
}
