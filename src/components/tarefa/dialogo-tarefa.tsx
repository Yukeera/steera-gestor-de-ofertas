"use client";

import { useState, useTransition } from "react";
import { ListPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { salvarTarefa } from "@/actions/tarefas";
import { AvatarMembro } from "@/components/equipe/avatar-membro";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { hojeISO } from "@/lib/data";
import { PRIORIDADE_LABEL, type Prioridade } from "@/lib/dominio/tipos";

export type MembroOpcao = {
  id: string;
  nome: string;
  fotoUrl: string | null;
};

export type OfertaOpcao = { id: string; nome: string };

export type TarefaEditavel = {
  id: string;
  titulo: string;
  descricao: string | null;
  prazo: string;
  prioridade: Prioridade;
  ofertaId: string | null;
  responsaveis: string[];
};

const SEM_OFERTA = "__nenhuma__";

export function DialogoTarefa({
  tarefa,
  equipe,
  ofertas,
  aberto: abertoControlado,
  aoAlternar,
}: {
  tarefa?: TarefaEditavel;
  equipe: MembroOpcao[];
  ofertas: OfertaOpcao[];
  aberto?: boolean;
  aoAlternar?: (aberto: boolean) => void;
}) {
  const editando = Boolean(tarefa);
  const controlado = abertoControlado !== undefined;

  const [abertoLocal, setAbertoLocal] = useState(false);
  const aberto = controlado ? abertoControlado : abertoLocal;

  const [erro, setErro] = useState<string | null>(null);
  const [salvando, iniciar] = useTransition();

  const [prioridade, setPrioridade] = useState<Prioridade>(
    tarefa?.prioridade ?? "NORMAL",
  );
  const [ofertaId, setOfertaId] = useState(tarefa?.ofertaId ?? SEM_OFERTA);
  const [responsaveis, setResponsaveis] = useState<string[]>(
    tarefa?.responsaveis ?? [],
  );

  function setAberto(novo: boolean) {
    if (controlado) aoAlternar?.(novo);
    else setAbertoLocal(novo);
  }

  function aoMudarAbertura(novo: boolean) {
    if (novo) {
      setPrioridade(tarefa?.prioridade ?? "NORMAL");
      setOfertaId(tarefa?.ofertaId ?? SEM_OFERTA);
      setResponsaveis(tarefa?.responsaveis ?? []);
      setErro(null);
    }
    setAberto(novo);
  }

  function aoEnviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);

    const dados = new FormData(evento.currentTarget);

    iniciar(async () => {
      const resultado = await salvarTarefa(tarefa?.id ?? null, {
        titulo: String(dados.get("titulo") ?? ""),
        descricao: String(dados.get("descricao") ?? ""),
        prazo: String(dados.get("prazo") ?? ""),
        prioridade,
        ofertaId: ofertaId === SEM_OFERTA ? null : ofertaId,
        responsaveis,
      });

      if (resultado.ok) {
        toast.success(editando ? "Tarefa atualizada." : "Tarefa designada.");
        setAberto(false);
      } else {
        setErro(resultado.erro);
      }
    });
  }

  return (
    <Dialog open={aberto} onOpenChange={aoMudarAbertura}>
      {controlado ? null : (
        <DialogTrigger asChild>
          <Button>
            <ListPlus aria-hidden="true" />
            Nova tarefa
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editando ? "Editar tarefa" : "Nova tarefa"}
          </DialogTitle>
          <DialogDescription>
            Trabalho individual, fora do roteiro das ofertas. Aparece no bloco
            &ldquo;Minhas tarefas&rdquo; de quem receber.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={aoEnviar} className="space-y-5" noValidate>
          <div className="space-y-2">
            <Label htmlFor="titulo">O que precisa ser feito</Label>
            <Input
              id="titulo"
              name="titulo"
              defaultValue={tarefa?.titulo}
              placeholder="Ex.: Revisar a copy do criativo do Detox"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Detalhes</Label>
            <Textarea
              id="descricao"
              name="descricao"
              defaultValue={tarefa?.descricao ?? ""}
              rows={3}
              placeholder="Contexto, links, o que considerar pronto (opcional)."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="prazo">Prazo</Label>
              <Input
                id="prazo"
                name="prazo"
                type="date"
                defaultValue={tarefa?.prazo ?? hojeISO()}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="prioridade">Prioridade</Label>
              <Select
                value={prioridade}
                onValueChange={(v) => setPrioridade(v as Prioridade)}
              >
                <SelectTrigger id="prioridade" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["NORMAL", "ALTA"] as const).map((p) => (
                    <SelectItem key={p} value={p}>
                      {PRIORIDADE_LABEL[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="oferta">Oferta relacionada</Label>
            <Select value={ofertaId} onValueChange={setOfertaId}>
              <SelectTrigger id="oferta" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SEM_OFERTA}>Nenhuma</SelectItem>
                {ofertas.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs">
              Opcional. Serve para achar a tarefa depois, pela oferta.
            </p>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Quem faz</legend>
            <div className="space-y-1">
              {equipe.map((membro) => (
                <label
                  key={membro.id}
                  className="hover:bg-accent/50 flex cursor-pointer items-center gap-2 rounded-md p-2 text-sm"
                >
                  <Checkbox
                    checked={responsaveis.includes(membro.id)}
                    onCheckedChange={(m) =>
                      setResponsaveis((atuais) =>
                        m === true
                          ? [...atuais, membro.id]
                          : atuais.filter((x) => x !== membro.id),
                      )
                    }
                  />
                  <AvatarMembro
                    nome={membro.nome}
                    fotoUrl={membro.fotoUrl}
                    tamanho="xs"
                  />
                  {membro.nome}
                </label>
              ))}
            </div>
          </fieldset>

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
                "Designar tarefa"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
