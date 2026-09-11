"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Archive,
  ArchiveRestore,
  MoreVertical,
  Pencil,
  Star,
} from "lucide-react";
import { toast } from "sonner";

import { alternarArquivado, definirPadrao } from "@/actions/roteiros";
import {
  DialogoRoteiro,
  type RoteiroEditavel,
} from "@/components/roteiro/dialogo-roteiro";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FUNCAO_LABEL, type Funcao } from "@/lib/dominio/tipos";
import { cn } from "@/lib/utils";

export type RoteiroDaLista = RoteiroEditavel & {
  ePadrao: boolean;
  arquivado: boolean;
  etapas: { titulo: string; funcoes: Funcao[] }[];
  ofertasQueUsaram: number;
};

export function CartaoRoteiro({ roteiro }: { roteiro: RoteiroDaLista }) {
  const [editando, setEditando] = useState(false);
  const [processando, iniciar] = useTransition();

  function tornarPadrao() {
    iniciar(async () => {
      const resultado = await definirPadrao(roteiro.id);
      if (resultado.ok) {
        toast.success(
          `"${roteiro.nome}" agora vem pré-selecionado ao montar uma Rodada.`,
        );
      } else {
        toast.error(resultado.erro, { duration: 8000 });
      }
    });
  }

  function arquivar() {
    iniciar(async () => {
      const resultado = await alternarArquivado(roteiro.id, !roteiro.arquivado);
      if (resultado.ok) {
        toast.success(
          roteiro.arquivado
            ? "Roteiro de volta em circulação."
            : "Roteiro arquivado. As ofertas montadas com ele não mudam.",
        );
      } else {
        toast.error(resultado.erro, { duration: 8000 });
      }
    });
  }

  return (
    <>
      <DialogoRoteiro
        roteiro={roteiro}
        aberto={editando}
        aoAlternar={setEditando}
      />

      <Card className={cn(roteiro.arquivado && "opacity-60")}>
        <CardContent className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 space-y-1">
              <h3 className="leading-tight font-medium">
                <Link
                  href={`/configuracoes/roteiros/${roteiro.id}`}
                  className="underline-offset-4 hover:underline"
                >
                  {roteiro.nome}
                </Link>
              </h3>
              {roteiro.descricao ? (
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {roteiro.descricao}
                </p>
              ) : null}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="-mt-1 shrink-0"
                  disabled={processando}
                >
                  <MoreVertical aria-hidden="true" />
                  <span className="sr-only">Ações para {roteiro.nome}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setEditando(true)}>
                  <Pencil aria-hidden="true" />
                  Editar nome e descrição
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={tornarPadrao}
                  disabled={roteiro.ePadrao || roteiro.arquivado}
                >
                  <Star aria-hidden="true" />
                  Tornar padrão
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={arquivar}>
                  {roteiro.arquivado ? (
                    <>
                      <ArchiveRestore aria-hidden="true" />
                      Desarquivar
                    </>
                  ) : (
                    <>
                      <Archive aria-hidden="true" />
                      Arquivar
                    </>
                  )}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {roteiro.ePadrao ? (
              <Badge>
                <Star className="size-3" aria-hidden="true" />
                Padrão
              </Badge>
            ) : null}
            <Badge variant="secondary" className="tabular">
              {roteiro.etapas.length === 1
                ? "1 etapa"
                : `${roteiro.etapas.length} etapas`}
            </Badge>
            {roteiro.ofertasQueUsaram > 0 ? (
              <Badge variant="outline" className="tabular">
                {roteiro.ofertasQueUsaram === 1
                  ? "1 oferta montada"
                  : `${roteiro.ofertasQueUsaram} ofertas montadas`}
              </Badge>
            ) : null}
            {roteiro.arquivado ? (
              <Badge variant="outline" className="border-dashed">
                Arquivado
              </Badge>
            ) : null}
          </div>

          <ol className="space-y-1">
            {roteiro.etapas.map((etapa, i) => (
              <li
                key={`${etapa.titulo}-${i}`}
                className="text-muted-foreground flex gap-2 text-sm"
              >
                <span className="font-mono text-xs tabular">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate">{etapa.titulo}</span>
                <span className="shrink-0 text-xs">
                  {etapa.funcoes.length > 0
                    ? etapa.funcoes.map((f) => FUNCAO_LABEL[f]).join(" + ")
                    : "—"}
                </span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </>
  );
}
