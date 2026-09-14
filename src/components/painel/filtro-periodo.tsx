"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** Atalhos que cobrem quase todo uso real; o resto vai no intervalo livre. */
export const ATALHOS = {
  "7": "7 dias",
  "30": "30 dias",
  "90": "90 dias",
  mes: "Este mês",
} as const;

export type Atalho = keyof typeof ATALHOS;

export function FiltroPeriodo({ de, ate }: { de: string; ate: string }) {
  const router = useRouter();
  const parametros = useSearchParams();
  const atalhoAtual = parametros.get("p") ?? "30";

  function navegar(alteracoes: Record<string, string | null>) {
    const proximos = new URLSearchParams(parametros.toString());

    for (const [chave, valor] of Object.entries(alteracoes)) {
      if (!valor) proximos.delete(chave);
      else proximos.set(chave, valor);
    }

    const consulta = proximos.toString();
    router.replace(consulta ? `/painel?${consulta}` : "/painel");
  }

  const intervaloLivre = Boolean(parametros.get("de") || parametros.get("ate"));

  return (
    // `filters in one row above the charts`: um lugar só para o controle de
    // período, não um por gráfico.
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex items-center gap-1 rounded-md border p-0.5">
        {Object.entries(ATALHOS).map(([valor, rotulo]) => {
          const ativo = !intervaloLivre && atalhoAtual === valor;
          return (
            <Button
              key={valor}
              variant={ativo ? "secondary" : "ghost"}
              size="sm"
              aria-pressed={ativo}
              onClick={() => navegar({ p: valor, de: null, ate: null })}
              className={cn(ativo && "font-medium")}
            >
              {rotulo}
            </Button>
          );
        })}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="painel-de">De</Label>
        <Input
          id="painel-de"
          type="date"
          className="w-40"
          value={parametros.get("de") ?? de}
          onChange={(e) => navegar({ de: e.target.value || null, p: null })}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="painel-ate">Até</Label>
        <Input
          id="painel-ate"
          type="date"
          className="w-40"
          value={parametros.get("ate") ?? ate}
          onChange={(e) => navegar({ ate: e.target.value || null, p: null })}
        />
      </div>
    </div>
  );
}
