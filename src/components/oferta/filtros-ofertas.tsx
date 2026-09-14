"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";

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
import {
  OFERTA_STATUS,
  OFERTA_STATUS_VISUAL,
  type OfertaStatus,
} from "@/lib/dominio/tipos";
import { cn } from "@/lib/utils";

const TODOS = "__todos__";

/** Qual coluna de data o período filtra. */
const CAMPOS_DE_DATA = {
  criada_em: "Cadastro na Peneira",
  data_prevista: "Dia na esteira",
  data_conclusao: "Conclusão da montagem",
  data_validacao: "Validação",
} as const;

export function FiltrosOfertas({
  rodadas,
  autores,
}: {
  rodadas: { id: string; nome: string }[];
  autores: { id: string; nome: string }[];
}) {
  const router = useRouter();
  const parametros = useSearchParams();

  const statusAtual = parametros.get("status");

  function navegar(alteracoes: Record<string, string | null>) {
    const proximos = new URLSearchParams(parametros.toString());

    for (const [chave, valor] of Object.entries(alteracoes)) {
      if (!valor || valor === TODOS) proximos.delete(chave);
      else proximos.set(chave, valor);
    }

    const consulta = proximos.toString();
    router.replace(consulta ? `/ofertas?${consulta}` : "/ofertas");
  }

  const temFiltro = [...parametros.keys()].length > 0;

  return (
    <div className="space-y-4">
      {/* RF-08.1: abas por status. São links de filtro, não navegação — por
          isso `aria-pressed` e não `aria-current`. */}
      <div className="flex flex-wrap gap-1.5">
        <Button
          variant={statusAtual ? "ghost" : "secondary"}
          size="sm"
          aria-pressed={!statusAtual}
          onClick={() => navegar({ status: null })}
        >
          Todas
        </Button>

        {OFERTA_STATUS.map((status) => {
          const visual = OFERTA_STATUS_VISUAL[status as OfertaStatus];
          const ativo = statusAtual === status;

          return (
            <Button
              key={status}
              variant={ativo ? "secondary" : "ghost"}
              size="sm"
              aria-pressed={ativo}
              onClick={() => navegar({ status })}
              className={cn(ativo && "font-medium")}
            >
              <span
                aria-hidden="true"
                className="size-2 rounded-full"
                style={{ background: visual.token }}
              />
              {visual.label}
            </Button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-44 space-y-1.5">
          <Label htmlFor="rodada">Rodada</Label>
          <Select
            value={parametros.get("rodada") ?? TODOS}
            onValueChange={(v) => navegar({ rodada: v })}
          >
            <SelectTrigger id="rodada" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todas</SelectItem>
              {rodadas.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-44 space-y-1.5">
          <Label htmlFor="autor">Quem cadastrou</Label>
          <Select
            value={parametros.get("autor") ?? TODOS}
            onValueChange={(v) => navegar({ autor: v })}
          >
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

        <div className="w-52 space-y-1.5">
          <Label htmlFor="campo">Período conta por</Label>
          <Select
            value={parametros.get("campo") ?? "criada_em"}
            onValueChange={(v) => navegar({ campo: v })}
          >
            <SelectTrigger id="campo" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CAMPOS_DE_DATA).map(([valor, rotulo]) => (
                <SelectItem key={valor} value={valor}>
                  {rotulo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="de">De</Label>
          <Input
            id="de"
            type="date"
            className="w-40"
            value={parametros.get("de") ?? ""}
            onChange={(e) => navegar({ de: e.target.value || null })}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ate">Até</Label>
          <Input
            id="ate"
            type="date"
            className="w-40"
            value={parametros.get("ate") ?? ""}
            onChange={(e) => navegar({ ate: e.target.value || null })}
          />
        </div>

        {temFiltro ? (
          <Button variant="ghost" onClick={() => router.replace("/ofertas")}>
            <X aria-hidden="true" />
            Limpar
          </Button>
        ) : null}
      </div>
    </div>
  );
}
