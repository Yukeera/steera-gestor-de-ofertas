"use client";

import { useId, useRef, useState, useTransition } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { atualizarMembro, convidarMembro } from "@/actions/equipe";
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
import {
  CARGOS,
  CARGO_LABEL,
  FUNCOES,
  FUNCAO_DESCRICAO,
  FUNCAO_LABEL,
  type Cargo,
  type Funcao,
} from "@/lib/dominio/tipos";

type MembroEditavel = {
  id: string;
  nome: string;
  email: string;
  cargo: Cargo;
  funcoes: Funcao[];
};

export function DialogoMembro({
  membro,
  gatilho,
}: {
  membro?: MembroEditavel;
  gatilho?: React.ReactNode;
}) {
  const editando = Boolean(membro);
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, iniciarSalvamento] = useTransition();
  const idErro = useId();
  const formRef = useRef<HTMLFormElement>(null);

  const [cargo, setCargo] = useState<Cargo>(membro?.cargo ?? "FUNCIONARIO");
  const [funcoes, setFuncoes] = useState<Funcao[]>(membro?.funcoes ?? []);

  // Reabrir o diálogo deve mostrar o estado salvo, não o que ficou da edição
  // anterior abandonada. O reset vive aqui, no evento que causa a abertura, e
  // não num efeito: efeito que só chama setState é re-render desperdiçado.
  function aoMudarAbertura(novoEstado: boolean) {
    if (novoEstado) {
      setCargo(membro?.cargo ?? "FUNCIONARIO");
      setFuncoes(membro?.funcoes ?? []);
      setErro(null);
    }
    setAberto(novoEstado);
  }

  function alternarFuncao(funcao: Funcao, marcada: boolean) {
    setFuncoes((atuais) =>
      marcada ? [...atuais, funcao] : atuais.filter((f) => f !== funcao),
    );
  }

  function aoEnviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);

    const dados = new FormData(evento.currentTarget);
    dados.set("cargo", cargo);
    dados.delete("funcoes");
    for (const funcao of funcoes) dados.append("funcoes", funcao);

    iniciarSalvamento(async () => {
      const resultado = membro
        ? await atualizarMembro(membro.id, dados)
        : await convidarMembro(dados);

      if (resultado.ok) {
        toast.success(
          editando
            ? "Membro atualizado."
            : "Convite enviado. A pessoa define a senha pelo e-mail.",
        );
        setAberto(false);
        formRef.current?.reset();
      } else {
        setErro(resultado.erro);
      }
    });
  }

  return (
    <Dialog open={aberto} onOpenChange={aoMudarAbertura}>
      <DialogTrigger asChild>
        {gatilho ?? (
          <Button>
            <UserPlus aria-hidden="true" />
            Convidar membro
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editando ? `Editar ${membro!.nome}` : "Convidar membro"}
          </DialogTitle>
          <DialogDescription>
            {editando
              ? "Cargo define o poder na hierarquia; funções definem o que a pessoa faz na esteira."
              : "A pessoa recebe um e-mail para definir a própria senha."}
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} onSubmit={aoEnviar} className="space-y-5" noValidate>
          <div className="space-y-2">
            <Label htmlFor="nome">Nome</Label>
            <Input
              id="nome"
              name="nome"
              defaultValue={membro?.nome}
              autoComplete="name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              defaultValue={membro?.email}
              autoComplete="email"
              required
              readOnly={editando}
              aria-describedby={editando ? "ajuda-email" : undefined}
            />
            {editando ? (
              <p id="ajuda-email" className="text-muted-foreground text-xs">
                O e-mail é a identidade de acesso e não muda por aqui.
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="cargo">Cargo</Label>
            <Select
              value={cargo}
              onValueChange={(valor) => setCargo(valor as Cargo)}
            >
              <SelectTrigger id="cargo" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CARGOS.map((valor) => (
                  <SelectItem key={valor} value={valor}>
                    {CARGO_LABEL[valor]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <fieldset className="space-y-3">
            <legend className="text-sm font-medium">Funções</legend>
            <p className="text-muted-foreground -mt-1 text-xs">
              Pode marcar mais de uma. É a função que sugere o responsável de
              cada etapa do Roteiro.
            </p>

            {FUNCOES.map((funcao) => (
              <label
                key={funcao}
                className="hover:bg-accent/50 flex cursor-pointer items-start gap-3 rounded-md p-2 transition-colors"
              >
                <Checkbox
                  checked={funcoes.includes(funcao)}
                  onCheckedChange={(marcada) =>
                    alternarFuncao(funcao, marcada === true)
                  }
                  className="mt-0.5"
                />
                <span className="space-y-0.5">
                  <span className="block text-sm font-medium">
                    {FUNCAO_LABEL[funcao]}
                  </span>
                  <span className="text-muted-foreground block text-xs">
                    {FUNCAO_DESCRICAO[funcao]}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>

          {erro ? (
            <p id={idErro} role="alert" className="text-destructive text-sm">
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
                "Enviar convite"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
