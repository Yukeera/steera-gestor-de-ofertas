"use client";

import { useId, useRef, useState, useTransition } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import {
  atualizarMembro,
  convidarMembro,
  criarAcessoDireto,
} from "@/actions/equipe";
import { SenhaGerada } from "@/components/equipe/senha-gerada";
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
  aberto: abertoControlado,
  aoAlternar,
}: {
  membro?: MembroEditavel;
  gatilho?: React.ReactNode;
  /**
   * Modo controlado. Necessário quando o gatilho é um item de menu: um Dialog
   * renderizado dentro de um DropdownMenu do Radix é desmontado junto com o
   * menu e nunca chega a aparecer.
   */
  aberto?: boolean;
  aoAlternar?: (aberto: boolean) => void;
}) {
  const editando = Boolean(membro);
  const controlado = abertoControlado !== undefined;

  const [abertoLocal, setAbertoLocal] = useState(false);
  const aberto = controlado ? abertoControlado : abertoLocal;

  function setAberto(novoEstado: boolean) {
    if (controlado) aoAlternar?.(novoEstado);
    else setAbertoLocal(novoEstado);
  }

  const [erro, setErro] = useState<string | null>(null);
  const [salvando, iniciarSalvamento] = useTransition();

  /**
   * Como o acesso chega até a pessoa.
   *
   * O padrão é "senha agora" de propósito: o SMTP embutido do Supabase só
   * entrega para membros da organização, então o convite por e-mail falha
   * silenciosamente para quem é de fora — e o Chefe descobre pela pessoa
   * dizendo que não recebeu nada.
   */
  const [porEmail, setPorEmail] = useState(false);
  const [senhaGerada, setSenhaGerada] = useState<{
    nome: string;
    email: string;
    senha: string;
  } | null>(null);
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
      setSenhaGerada(null);
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
      if (membro) {
        const resultado = await atualizarMembro(membro.id, dados);
        if (resultado.ok) {
          toast.success("Membro atualizado.");
          setAberto(false);
        } else {
          setErro(resultado.erro);
        }
        return;
      }

      if (porEmail) {
        const resultado = await convidarMembro(dados);
        if (resultado.ok) {
          toast.success(
            "Convite enviado. A pessoa define a senha pelo e-mail.",
          );
          setAberto(false);
          formRef.current?.reset();
        } else {
          setErro(resultado.erro);
        }
        return;
      }

      const resultado = await criarAcessoDireto(dados);
      if (resultado.ok && resultado.senha) {
        // O diálogo não fecha: a senha aparece uma vez só e some se fechar.
        setSenhaGerada({
          nome: String(dados.get("nome") ?? ""),
          email: String(dados.get("email") ?? ""),
          senha: resultado.senha,
        });
        formRef.current?.reset();
      } else if (!resultado.ok) {
        setErro(resultado.erro);
      }
    });
  }

  return (
    <Dialog open={aberto} onOpenChange={aoMudarAbertura}>
      {controlado ? null : (
        <DialogTrigger asChild>
          {gatilho ?? (
            <Button>
              <UserPlus aria-hidden="true" />
              Adicionar membro
            </Button>
          )}
        </DialogTrigger>
      )}

      <DialogContent className="sm:max-w-lg">
        {senhaGerada ? (
          <>
            <DialogHeader>
              <DialogTitle>Acesso criado</DialogTitle>
              <DialogDescription>
                Copie a senha antes de fechar.
              </DialogDescription>
            </DialogHeader>
            <SenhaGerada
              nome={senhaGerada.nome}
              email={senhaGerada.email}
              senha={senhaGerada.senha}
              aoFechar={() => setAberto(false)}
            />
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>
                {editando ? `Editar ${membro!.nome}` : "Adicionar à equipe"}
              </DialogTitle>
              <DialogDescription>
                {editando
                  ? "Cargo define o poder na hierarquia; funções definem o que a pessoa faz na esteira."
                  : "Cargo define o poder na hierarquia; funções definem o que a pessoa faz na esteira."}
              </DialogDescription>
            </DialogHeader>

            <form
              ref={formRef}
              onSubmit={aoEnviar}
              className="space-y-5"
              noValidate
            >
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
                  Pode marcar mais de uma. É a função que sugere o responsável
                  de cada etapa do Roteiro.
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

              {editando ? null : (
                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium">
                    Como ela entra
                  </legend>

                  <label className="hover:bg-accent/50 flex cursor-pointer items-start gap-3 rounded-md border p-3">
                    <input
                      type="radio"
                      name="meio"
                      checked={!porEmail}
                      onChange={() => setPorEmail(false)}
                      className="mt-1"
                    />
                    <span className="space-y-0.5">
                      <span className="block text-sm font-medium">
                        Gerar senha agora
                      </span>
                      <span className="text-muted-foreground block text-xs leading-relaxed">
                        O Steera cria uma senha provisória e mostra aqui. Você
                        manda por WhatsApp. Não depende de e-mail nenhum.
                      </span>
                    </span>
                  </label>

                  <label className="hover:bg-accent/50 flex cursor-pointer items-start gap-3 rounded-md border p-3">
                    <input
                      type="radio"
                      name="meio"
                      checked={porEmail}
                      onChange={() => setPorEmail(true)}
                      className="mt-1"
                    />
                    <span className="space-y-0.5">
                      <span className="block text-sm font-medium">
                        Enviar convite por e-mail
                      </span>
                      <span className="text-muted-foreground block text-xs leading-relaxed">
                        Exige SMTP próprio configurado. Sem ele, o Supabase só
                        entrega para membros da organização — e o convite falha
                        calado para quem é de fora.
                      </span>
                    </span>
                  </label>
                </fieldset>
              )}

              {erro ? (
                <p
                  id={idErro}
                  role="alert"
                  className="text-destructive text-sm"
                >
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
                  ) : porEmail ? (
                    "Enviar convite"
                  ) : (
                    "Criar acesso"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
