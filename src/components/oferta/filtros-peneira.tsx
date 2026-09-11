"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const ESTADOS_PENEIRA = {
  peneira: "Na Peneira",
  escaladas: "Já escaladas",
  descartadas: "Descartadas",
  todas: "Todas",
} as const;

export type EstadoPeneira = keyof typeof ESTADOS_PENEIRA;

const TODOS = "__todos__";

/**
 * Filtros da Peneira.
 *
 * O estado vive na URL, não no componente: a busca filtrada fica compartilhável
 * e o botão voltar do navegador funciona como a pessoa espera.
 */
export function FiltrosPeneira({
  autores,
  nichos,
}: {
  autores: { id: string; nome: string }[];
  nichos: string[];
}) {
  const router = useRouter();
  const parametros = useSearchParams();

  const [busca, setBusca] = useState(parametros.get("q") ?? "");

  const estado = (parametros.get("estado") ?? "peneira") as EstadoPeneira;
  const autor = parametros.get("autor") ?? TODOS;
  const nicho = parametros.get("nicho") ?? TODOS;

  function navegar(alteracoes: Record<string, string | null>) {
    const proximos = new URLSearchParams(parametros.toString());

    for (const [chave, valor] of Object.entries(alteracoes)) {
      if (!valor || valor === TODOS) proximos.delete(chave);
      else proximos.set(chave, valor);
    }

    const consulta = proximos.toString();
    router.replace(consulta ? `/peneira?${consulta}` : "/peneira");
  }

  // Digitar não deve disparar uma navegação por tecla.
  useEffect(() => {
    const atual = parametros.get("q") ?? "";
    if (busca === atual) return;

    const relogio = setTimeout(() => navegar({ q: busca || null }), 350);
    return () => clearTimeout(relogio);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca]);

  const temFiltro =
    parametros.get("q") ||
    parametros.get("autor") ||
    parametros.get("nicho") ||
    (parametros.get("estado") && parametros.get("estado") !== "peneira");

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-56 flex-1 space-y-1.5">
        <Label htmlFor="busca">Buscar</Label>
        <div className="relative">
          <Search
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <Input
            id="busca"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Nome da oferta"
            className="pl-9"
          />
        </div>
      </div>

      <div className="w-44 space-y-1.5">
        <Label htmlFor="estado">Estado</Label>
        <Select value={estado} onValueChange={(v) => navegar({ estado: v })}>
          <SelectTrigger id="estado" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(ESTADOS_PENEIRA).map(([valor, rotulo]) => (
              <SelectItem key={valor} value={valor}>
                {rotulo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="w-44 space-y-1.5">
        <Label htmlFor="autor">Quem cadastrou</Label>
        <Select value={autor} onValueChange={(v) => navegar({ autor: v })}>
          <SelectTrigger id="autor" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Qualquer um</SelectItem>
            {autores.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {nichos.length > 0 ? (
        <div className="w-44 space-y-1.5">
          <Label htmlFor="nicho">Nicho</Label>
          <Select value={nicho} onValueChange={(v) => navegar({ nicho: v })}>
            <SelectTrigger id="nicho" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Qualquer um</SelectItem>
              {nichos.map((n) => (
                <SelectItem key={n} value={n}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {temFiltro ? (
        <Button
          variant="ghost"
          onClick={() => {
            setBusca("");
            router.replace("/peneira");
          }}
        >
          <X aria-hidden="true" />
          Limpar
        </Button>
      ) : null}
    </div>
  );
}
