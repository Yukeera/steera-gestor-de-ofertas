"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { atualizarRoteiro, criarRoteiro } from "@/actions/roteiros";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type RoteiroEditavel = {
  id: string;
  nome: string;
  descricao: string | null;
};

export function DialogoRoteiro({
  roteiro,
  aberto: abertoControlado,
  aoAlternar,
}: {
  roteiro?: RoteiroEditavel;
  aberto?: boolean;
  aoAlternar?: (aberto: boolean) => void;
}) {
  const editando = Boolean(roteiro);
  const controlado = abertoControlado !== undefined;
  const router = useRouter();

  const [abertoLocal, setAbertoLocal] = useState(false);
  const aberto = controlado ? abertoControlado : abertoLocal;

  const [erro, setErro] = useState<string | null>(null);
  const [salvando, iniciar] = useTransition();

  function setAberto(novo: boolean) {
    if (controlado) aoAlternar?.(novo);
    else setAbertoLocal(novo);
  }

  function aoEnviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);

    const dados = new FormData(evento.currentTarget);

    iniciar(async () => {
      const resultado = roteiro
        ? await atualizarRoteiro(roteiro.id, dados)
        : await criarRoteiro(dados);

      if (!resultado.ok) {
        setErro(resultado.erro);
        return;
      }

      setAberto(false);

      if (resultado.id) {
        // Roteiro novo nasce com uma etapa em branco: leva direto para o
        // editor, que é onde o trabalho de verdade acontece.
        toast.success("Roteiro criado. Agora monte as etapas.");
        router.push(`/configuracoes/roteiros/${resultado.id}`);
      } else {
        toast.success("Roteiro atualizado.");
      }
    });
  }

  return (
    <Dialog
      open={aberto}
      onOpenChange={(novo) => {
        if (novo) setErro(null);
        setAberto(novo);
      }}
    >
      {controlado ? null : (
        <DialogTrigger asChild>
          <Button>
            <Plus aria-hidden="true" />
            Novo roteiro
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editando ? "Editar roteiro" : "Novo Roteiro de Montagem"}
          </DialogTitle>
          <DialogDescription>
            Um roteiro é o passo a passo que toda oferta percorre na esteira.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={aoEnviar} className="space-y-5" noValidate>
          <div className="space-y-2">
            <Label htmlFor="nome">Nome</Label>
            <Input
              id="nome"
              name="nome"
              defaultValue={roteiro?.nome}
              placeholder="Ex.: Oferta com VSL"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Quando usar</Label>
            <Textarea
              id="descricao"
              name="descricao"
              defaultValue={roteiro?.descricao ?? ""}
              rows={3}
              placeholder="Em que situação a equipe escolhe este roteiro."
            />
          </div>

          {erro ? (
            <p role="alert" className="text-destructive text-sm">
              {erro}
            </p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setAberto(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={salvando}>
              {salvando ? (
                <>
                  <Loader2 className="animate-spin" aria-hidden="true" />
                  Salvando…
                </>
              ) : editando ? (
                "Salvar"
              ) : (
                "Criar e montar etapas"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
