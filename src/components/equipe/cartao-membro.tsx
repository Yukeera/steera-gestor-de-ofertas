"use client";

import { useState, useTransition } from "react";
import { MailPlus, MoreVertical, Pencil, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";

import { alternarAtivo, reenviarConvite } from "@/actions/equipe";
import { AvatarMembro } from "@/components/equipe/avatar-membro";
import { DialogoMembro } from "@/components/equipe/dialogo-membro";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CARGO_LABEL,
  FUNCAO_LABEL,
  type Cargo,
  type Funcao,
} from "@/lib/dominio/tipos";
import { cn } from "@/lib/utils";

export type MembroDaGrade = {
  id: string;
  nome: string;
  email: string;
  cargo: Cargo;
  funcoes: Funcao[];
  ativo: boolean;
  fotoUrl: string | null;
};

/**
 * Cor da faixa por função principal.
 *
 * É identidade visual, nunca o único sinal: o nome da função aparece escrito
 * logo abaixo, em chip. Quem não distingue as cores lê a mesma informação.
 */
const FAIXA_POR_FUNCAO: Record<Funcao, string> = {
  MESTRE_ESTEIRA: "var(--marca)",
  GESTOR_TRAFEGO: "var(--status-esteira)",
  GARIMPEIRO: "var(--status-concluida)",
  ENGENHEIRO_FLUXOS: "var(--status-validada)",
};

export function CartaoMembro({
  membro,
  podeEditar,
  ehVoce,
  indice = 0,
}: {
  membro: MembroDaGrade;
  podeEditar: boolean;
  ehVoce: boolean;
  indice?: number;
}) {
  const [processando, iniciar] = useTransition();
  const [editando, setEditando] = useState(false);

  // A primeira função define a faixa. Acumular funções é comum, mas a faixa
  // precisa de uma cor só para continuar sendo um sinal, e não um arco-íris.
  const faixa = membro.funcoes[0]
    ? FAIXA_POR_FUNCAO[membro.funcoes[0]]
    : "var(--muted-foreground)";

  function reenviar() {
    iniciar(async () => {
      const resultado = await reenviarConvite(membro.email);
      if (resultado.ok) {
        toast.success(
          resultado.tipo === "recuperacao"
            ? `${membro.nome} já tinha acesso criado, então foi um link para definir a senha.`
            : `Novo convite enviado para ${membro.email}.`,
        );
      } else {
        toast.error(resultado.erro, { duration: 8000 });
      }
    });
  }

  function alternar() {
    iniciar(async () => {
      const resultado = await alternarAtivo(membro.id, !membro.ativo);
      if (resultado.ok) {
        toast.success(
          membro.ativo
            ? `${membro.nome} foi desativado e some dos seletores.`
            : `${membro.nome} voltou para a equipe.`,
        );
      } else {
        toast.error(resultado.erro);
      }
    });
  }

  return (
    <>
      <DialogoMembro
        membro={membro}
        aberto={editando}
        aoAlternar={setEditando}
      />

      <Card
        className={cn(
          // `h-full` + coluna flexível: cards da mesma linha terminam na mesma
          // altura mesmo quando um tem três funções e outro tem uma.
          "cartao-vivo entra relative flex h-full flex-col overflow-hidden pt-0 text-center",
          !membro.ativo && "opacity-60",
        )}
        style={{ "--i": indice } as React.CSSProperties}
      >
        {/* Faixa de identidade. O gradiente desce até o fundo do card, então a
            cor some antes de chegar no texto e não rouba contraste dele. */}
        <div
          aria-hidden="true"
          className="h-20 w-full shrink-0"
          style={{
            background: `linear-gradient(to bottom, color-mix(in oklab, ${faixa} 28%, transparent), transparent)`,
          }}
        />

        {podeEditar ? (
          <div className="absolute top-2 right-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  disabled={processando}
                >
                  <MoreVertical aria-hidden="true" />
                  <span className="sr-only">Ações para {membro.nome}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setEditando(true)}>
                  <Pencil aria-hidden="true" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={reenviar} disabled={ehVoce}>
                  <MailPlus aria-hidden="true" />
                  Reenviar acesso
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={alternar} disabled={ehVoce}>
                  {membro.ativo ? (
                    <>
                      <UserX aria-hidden="true" />
                      Desativar acesso
                    </>
                  ) : (
                    <>
                      <UserCheck aria-hidden="true" />
                      Reativar acesso
                    </>
                  )}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : null}

        <CardContent className="-mt-12 flex flex-1 flex-col gap-3">
          {/* O anel na cor da função amarra a foto à faixa e faz o retrato ser
              a primeira coisa que o olho encontra. */}
          <AvatarMembro
            nome={membro.nome}
            fotoUrl={membro.fotoUrl}
            tamanho="xl"
            className="ring-card mx-auto shadow-sm ring-4"
            style={{ outline: `2px solid ${faixa}`, outlineOffset: 2 }}
          />

          <div className="space-y-0.5">
            <p className="text-[15px] leading-tight font-semibold">
              {membro.nome}
              {ehVoce ? (
                <span className="text-muted-foreground text-sm font-normal">
                  {" "}
                  · você
                </span>
              ) : null}
            </p>
            <p className="text-muted-foreground truncate text-xs">
              {membro.email}
            </p>
          </div>

          {/* `mt-auto` empurra os chips para o rodapé: eles ficam alinhados
              entre cards vizinhos em vez de flutuarem a alturas diferentes. */}
          <div className="mt-auto flex flex-wrap justify-center gap-1.5">
            <Badge variant={membro.cargo === "CHEFE" ? "default" : "secondary"}>
              {CARGO_LABEL[membro.cargo]}
            </Badge>
            {membro.funcoes.map((funcao) => (
              <Badge key={funcao} variant="outline">
                {FUNCAO_LABEL[funcao]}
              </Badge>
            ))}
            {membro.ativo ? null : (
              <Badge variant="outline" className="border-dashed">
                Desativado
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
