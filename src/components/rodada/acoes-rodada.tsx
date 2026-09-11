"use client";

import { useState, useTransition } from "react";
import { Loader2, Undo2, XCircle } from "lucide-react";
import { toast } from "sonner";

import { cancelarRodada, removerOferta } from "@/actions/rodadas";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export function BotaoRemoverOferta({
  rodadaId,
  ofertaId,
  nomeOferta,
  temEtapaConcluida,
}: {
  rodadaId: string;
  ofertaId: string;
  nomeOferta: string;
  temEtapaConcluida: boolean;
}) {
  const [processando, iniciar] = useTransition();

  function remover() {
    iniciar(async () => {
      const resultado = await removerOferta(rodadaId, ofertaId);
      if (resultado.ok) toast.success(`"${nomeOferta}" voltou para a Peneira.`);
      else toast.error(resultado.erro, { duration: 8000 });
    });
  }

  // O banco recusa de qualquer jeito; desabilitar aqui evita a pessoa clicar
  // para só então descobrir.
  if (temEtapaConcluida) {
    return (
      <Button
        variant="ghost"
        size="sm"
        disabled
        title="Já há etapa concluída nesta oferta."
      >
        <Undo2 aria-hidden="true" />
        Devolver
      </Button>
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" disabled={processando}>
          {processando ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <Undo2 aria-hidden="true" />
          )}
          Devolver
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Devolver &ldquo;{nomeOferta}&rdquo; para a Peneira?
          </AlertDialogTitle>
          <AlertDialogDescription>
            A oferta sai desta Rodada e as etapas montadas para ela são
            descartadas. Os dados de origem — descrição, referência, capa —
            continuam intactos.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={remover}>Devolver</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function BotaoCancelarRodada({
  rodadaId,
  nome,
  quantidade,
}: {
  rodadaId: string;
  nome: string;
  quantidade: number;
}) {
  const [aberto, setAberto] = useState(false);
  const [processando, iniciar] = useTransition();

  function cancelar() {
    iniciar(async () => {
      const resultado = await cancelarRodada(rodadaId);
      if (resultado.ok) {
        toast.success("Rodada cancelada. As ofertas voltaram para a Peneira.");
        setAberto(false);
      } else {
        toast.error(resultado.erro, { duration: 10000 });
      }
    });
  }

  return (
    <AlertDialog open={aberto} onOpenChange={setAberto}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <XCircle aria-hidden="true" />
          Cancelar Rodada
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancelar &ldquo;{nome}&rdquo;?</AlertDialogTitle>
          <AlertDialogDescription>
            As {quantidade} oferta(s) que ainda estão na esteira voltam para a
            Peneira e perdem as etapas montadas. Se alguma já tiver etapa
            concluída, o cancelamento é recusado — nesse caso, devolva as ofertas
            uma a uma.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={processando}>Voltar</AlertDialogCancel>
          <AlertDialogAction onClick={cancelar} disabled={processando}>
            {processando ? "Cancelando…" : "Cancelar Rodada"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
