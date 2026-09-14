"use client";

import Link from "next/link";
import { Check, ExternalLink, ImageOff } from "lucide-react";

import { AvatarMembro } from "@/components/equipe/avatar-membro";
import { SeloStatus } from "@/components/oferta/selo-status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { formatarDataPorExtenso } from "@/lib/data";
import { cn } from "@/lib/utils";

import type { OfertaNoCalendario } from "./tipos";

export type EtapaResumida = {
  id: string;
  ordem: number;
  titulo: string;
  concluida: boolean;
  responsaveis: { id: string; nome: string; fotoUrl: string | null }[];
};

/**
 * RF-05.3 — detalhe da oferta ao clicar no card.
 *
 * Mostra a checklist em leitura, com a miniatura de quem é dono de cada etapa.
 * Marcar etapa é da tela Hoje e da página da oferta: aqui o objetivo é
 * enxergar a situação do dia sem sair do calendário.
 */
export function PopupOferta({
  oferta,
  etapas,
  aberto,
  aoAlternar,
}: {
  oferta: OfertaNoCalendario | null;
  etapas: EtapaResumida[];
  aberto: boolean;
  aoAlternar: (aberto: boolean) => void;
}) {
  if (!oferta) return null;

  return (
    <Dialog open={aberto} onOpenChange={aoAlternar}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            {oferta.nome}
            <SeloStatus status={oferta.status} />
          </DialogTitle>
          <DialogDescription>
            {formatarDataPorExtenso(oferta.dataPrevista)}
            {oferta.rodada ? ` · ${oferta.rodada.nome}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-3">
          <div className="bg-muted relative size-20 shrink-0 overflow-hidden rounded">
            {oferta.capaUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- URL assinada e efêmera do Storage privado
              <img
                src={oferta.capaUrl}
                alt=""
                className="absolute inset-0 size-full object-cover"
              />
            ) : (
              <ImageOff
                className="text-muted-foreground absolute inset-0 m-auto size-5"
                aria-hidden="true"
              />
            )}
          </div>
          <p className="text-muted-foreground flex-1 text-sm leading-relaxed">
            {oferta.descricao}
          </p>
        </div>

        <div className="space-y-1.5">
          <Progress
            value={
              oferta.totalEtapas > 0
                ? (oferta.etapasConcluidas / oferta.totalEtapas) * 100
                : 0
            }
          />
          <p className="text-muted-foreground text-xs tabular">
            {oferta.etapasConcluidas} de {oferta.totalEtapas} etapas concluídas
          </p>
        </div>

        <ol className="space-y-1">
          {etapas.map((etapa) => (
            <li
              key={etapa.id}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm"
            >
              <span
                className={cn(
                  "flex size-4 shrink-0 items-center justify-center rounded-sm border",
                  etapa.concluida &&
                    "bg-[color:var(--status-validada)] border-transparent text-white",
                )}
                aria-hidden="true"
              >
                {etapa.concluida ? <Check className="size-3" /> : null}
              </span>

              <span
                className={cn(
                  "min-w-0 flex-1",
                  etapa.concluida &&
                    "text-muted-foreground line-through opacity-70",
                )}
              >
                {etapa.titulo}
              </span>

              {etapa.responsaveis.length === 0 ? (
                <Badge variant="outline" className="shrink-0 font-normal">
                  sem dono
                </Badge>
              ) : (
                <span className="flex shrink-0 -space-x-2">
                  {etapa.responsaveis.map((r) => (
                    <AvatarMembro
                      key={r.id}
                      nome={r.nome}
                      fotoUrl={r.fotoUrl}
                      tamanho="xs"
                      className="ring-background ring-2"
                    />
                  ))}
                </span>
              )}
            </li>
          ))}
        </ol>

        <Button asChild variant="secondary">
          <Link href={`/ofertas/${oferta.id}`}>
            Abrir a oferta
            <ExternalLink aria-hidden="true" />
          </Link>
        </Button>
      </DialogContent>
    </Dialog>
  );
}
