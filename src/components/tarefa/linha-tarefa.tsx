"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { MoreVertical, Pencil, RotateCcw, XCircle } from "lucide-react";
import { toast } from "sonner";

import {
  cancelarTarefa,
  concluirTarefa,
  reabrirTarefa,
} from "@/actions/tarefas";
import { AvatarMembro } from "@/components/equipe/avatar-membro";
import {
  DialogoTarefa,
  type MembroOpcao,
  type OfertaOpcao,
  type TarefaEditavel,
} from "@/components/tarefa/dialogo-tarefa";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { rotuloDePrazo } from "@/lib/data";
import { type Prioridade, type TarefaStatus } from "@/lib/dominio/tipos";
import { cn } from "@/lib/utils";

export type TarefaDaLista = {
  id: string;
  titulo: string;
  descricao: string | null;
  prazo: string;
  prioridade: Prioridade;
  status: TarefaStatus;
  motivoCancelamento: string | null;
  oferta: { id: string; nome: string } | null;
  responsaveis: MembroOpcao[];
};

export function LinhaTarefa({
  tarefa,
  podeGerir,
  equipe,
  ofertas,
}: {
  tarefa: TarefaDaLista;
  podeGerir: boolean;
  equipe: MembroOpcao[];
  ofertas: OfertaOpcao[];
}) {
  const [editando, setEditando] = useState(false);
  const [concluida, setConcluida] = useState(tarefa.status === "CONCLUIDA");
  const [processando, iniciar] = useTransition();

  const cancelada = tarefa.status === "CANCELADA";
  // RN-14: "atrasada" nunca é gravado, é sempre derivado.
  const atrasada =
    !concluida && !cancelada && rotuloDePrazo(tarefa.prazo).startsWith("atrasada");

  function alternar(novo: boolean) {
    setConcluida(novo);

    void concluirTarefa(tarefa.id, novo).then((r) => {
      if (!r.ok) {
        setConcluida(!novo);
        toast.error(r.erro, { duration: 6000 });
      }
    });
  }

  function cancelar() {
    iniciar(async () => {
      const r = await cancelarTarefa(tarefa.id, "");
      if (r.ok) toast.success("Tarefa cancelada.");
      else toast.error(r.erro);
    });
  }

  function reabrir() {
    iniciar(async () => {
      const r = await reabrirTarefa(tarefa.id);
      if (r.ok) toast.success("Tarefa reaberta.");
      else toast.error(r.erro);
    });
  }

  const dadosParaEdicao: TarefaEditavel = {
    id: tarefa.id,
    titulo: tarefa.titulo,
    descricao: tarefa.descricao,
    prazo: tarefa.prazo,
    prioridade: tarefa.prioridade,
    ofertaId: tarefa.oferta?.id ?? null,
    responsaveis: tarefa.responsaveis.map((r) => r.id),
  };

  return (
    <>
      {podeGerir ? (
        <DialogoTarefa
          tarefa={dadosParaEdicao}
          equipe={equipe}
          ofertas={ofertas}
          aberto={editando}
          aoAlternar={setEditando}
        />
      ) : null}

      <li
        className={cn(
          "flex flex-wrap items-start gap-3 px-4 py-3",
          cancelada && "opacity-60",
        )}
      >
        <label className="flex min-h-11 cursor-pointer items-center pt-0.5">
          <Checkbox
            checked={concluida}
            disabled={cancelada}
            onCheckedChange={(m) => alternar(m === true)}
            aria-label={`Concluir a tarefa ${tarefa.titulo}`}
          />
        </label>

        <div className="min-w-48 flex-1 space-y-1">
          <p
            className={cn(
              "text-sm leading-snug",
              (concluida || cancelada) &&
                "text-muted-foreground line-through opacity-70",
            )}
          >
            {tarefa.titulo}
          </p>

          {tarefa.descricao ? (
            <p className="text-muted-foreground text-xs leading-relaxed">
              {tarefa.descricao}
            </p>
          ) : null}

          <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
            <Badge variant="outline" className="font-normal">
              tarefa
            </Badge>
            {tarefa.oferta ? (
              <Link
                href={`/ofertas/${tarefa.oferta.id}`}
                className="underline-offset-4 hover:underline"
              >
                {tarefa.oferta.nome}
              </Link>
            ) : null}
            {cancelada ? (
              <span>cancelada</span>
            ) : (
              <span
                className={cn("tabular", atrasada && "text-[color:var(--status-atrasada)]")}
              >
                {rotuloDePrazo(tarefa.prazo)}
              </span>
            )}
            {tarefa.prioridade === "ALTA" && !concluida && !cancelada ? (
              <Badge
                variant="outline"
                className="border-[color:var(--status-atrasada)] text-[color:var(--status-atrasada)]"
              >
                Alta
              </Badge>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex -space-x-2">
            {tarefa.responsaveis.map((r) => (
              <AvatarMembro
                key={r.id}
                nome={r.nome}
                fotoUrl={r.fotoUrl}
                tamanho="xs"
                className="ring-background ring-2"
              />
            ))}
          </span>

          {podeGerir ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  disabled={processando}
                >
                  <MoreVertical aria-hidden="true" />
                  <span className="sr-only">Ações para {tarefa.titulo}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setEditando(true)}>
                  <Pencil aria-hidden="true" />
                  Editar
                </DropdownMenuItem>
                {cancelada ? (
                  <DropdownMenuItem onSelect={reabrir}>
                    <RotateCcw aria-hidden="true" />
                    Reabrir
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onSelect={cancelar}>
                    <XCircle aria-hidden="true" />
                    Cancelar
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </li>
    </>
  );
}
