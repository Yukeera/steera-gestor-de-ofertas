"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ImageOff, MoreVertical, Pencil, Trash2, Undo2 } from "lucide-react";
import { toast } from "sonner";

import { descartarIdeia, restaurarIdeia } from "@/actions/peneira";
import { AvatarMembro } from "@/components/equipe/avatar-membro";
import {
  DialogoIdeia,
  type IdeiaEditavel,
} from "@/components/oferta/dialogo-ideia";
import { SeloStatus } from "@/components/oferta/selo-status";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { formatarData } from "@/lib/data";
import type { OfertaStatus } from "@/lib/dominio/tipos";

export type IdeiaDaGrade = IdeiaEditavel & {
  status: OfertaStatus;
  nicho: string | null;
  criadaEm: string;
  motivoDescarte: string | null;
  autor: { nome: string; fotoUrl: string | null } | null;
};

export function CartaoIdeia({
  ideia,
  podeMexer,
}: {
  ideia: IdeiaDaGrade;
  podeMexer: boolean;
}) {
  const [confirmando, setConfirmando] = useState(false);
  const [editando, setEditando] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [processando, iniciar] = useTransition();

  const naPeneira = ideia.status === "NA_PENEIRA";
  const descartada = ideia.status === "DESCARTADA";
  // RF-02.5: escalada para uma Rodada, a ideia não volta a ser editável aqui.
  const escalada = !naPeneira && !descartada;

  function descartar() {
    iniciar(async () => {
      const resultado = await descartarIdeia(ideia.id, motivo);
      if (resultado.ok) {
        toast.success(
          "Ideia descartada. Ela continua no filtro de descartadas.",
        );
        setConfirmando(false);
        setMotivo("");
      } else {
        toast.error(resultado.erro);
      }
    });
  }

  function restaurar() {
    iniciar(async () => {
      const resultado = await restaurarIdeia(ideia.id);
      if (resultado.ok) toast.success("Ideia de volta à Peneira.");
      else toast.error(resultado.erro);
    });
  }

  return (
    <>
      <Card className="overflow-hidden pt-0">
        {/* aspect-video fixo reserva o espaço antes da imagem carregar,
            evitando o salto de layout (CLS). */}
        <div className="bg-muted relative aspect-video w-full overflow-hidden">
          {ideia.capaUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- URL assinada e efêmera do Storage privado
            <img
              src={ideia.capaUrl}
              alt={`Capa da oferta ${ideia.nome}`}
              loading="lazy"
              className="absolute inset-0 size-full object-cover"
            />
          ) : (
            <div className="text-muted-foreground absolute inset-0 flex flex-col items-center justify-center gap-1">
              <ImageOff className="size-6" aria-hidden="true" />
              <span className="text-xs">Sem capa</span>
            </div>
          )}

          <div className="absolute top-2 left-2">
            <SeloStatus status={ideia.status} className="backdrop-blur" />
          </div>
        </div>

        <CardContent className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="leading-tight font-medium">
              {escalada ? (
                <Link
                  href={`/ofertas/${ideia.id}`}
                  className="hover:underline underline-offset-4"
                >
                  {ideia.nome}
                </Link>
              ) : (
                ideia.nome
              )}
            </h3>

            {podeMexer && !escalada ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="-mt-1 shrink-0"
                    disabled={processando}
                  >
                    <MoreVertical aria-hidden="true" />
                    <span className="sr-only">Ações para {ideia.nome}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {naPeneira ? (
                    <>
                      <DropdownMenuItem onSelect={() => setEditando(true)}>
                        <Pencil aria-hidden="true" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={(e) => {
                          e.preventDefault();
                          setConfirmando(true);
                        }}
                      >
                        <Trash2 aria-hidden="true" />
                        Descartar
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <DropdownMenuItem onSelect={restaurar}>
                      <Undo2 aria-hidden="true" />
                      Voltar para a Peneira
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>

          <p className="text-muted-foreground line-clamp-3 text-sm leading-relaxed">
            {ideia.descricao}
          </p>

          {ideia.anuncianteReferencia || ideia.nicho ? (
            <p className="text-muted-foreground text-xs">
              {[ideia.anuncianteReferencia, ideia.nicho]
                .filter(Boolean)
                .join(" · ")}
            </p>
          ) : null}

          {descartada && ideia.motivoDescarte ? (
            <p className="text-muted-foreground border-l-2 pl-2 text-xs italic">
              {ideia.motivoDescarte}
            </p>
          ) : null}

          <div className="text-muted-foreground flex items-center gap-2 pt-1 text-xs">
            {ideia.autor ? (
              <AvatarMembro
                nome={ideia.autor.nome}
                fotoUrl={ideia.autor.fotoUrl}
                tamanho="xs"
              />
            ) : null}
            <span className="truncate">
              {ideia.autor?.nome ?? "Autor removido"}
            </span>
            <span aria-hidden="true">·</span>
            <time dateTime={ideia.criadaEm} className="tabular">
              {formatarData(ideia.criadaEm)}
            </time>
          </div>
        </CardContent>
      </Card>

      <DialogoIdeia ideia={ideia} aberto={editando} aoAlternar={setEditando} />

      <AlertDialog open={confirmando} onOpenChange={setConfirmando}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Descartar &ldquo;{ideia.nome}&rdquo;?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Ela sai da grade mas continua no banco, no filtro de descartadas.
              Anotar o motivo evita a equipe recadastrar a mesma ideia daqui a
              três meses.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2">
            <label
              htmlFor={`motivo-${ideia.id}`}
              className="text-sm font-medium"
            >
              Motivo (opcional)
            </label>
            <Textarea
              id={`motivo-${ideia.id}`}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
              placeholder="Ex.: nicho saturado, criativo fraco, já testamos algo igual."
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={processando}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={descartar} disabled={processando}>
              Descartar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
