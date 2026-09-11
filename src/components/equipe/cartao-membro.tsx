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

export function CartaoMembro({
  membro,
  podeEditar,
  ehVoce,
}: {
  membro: MembroDaGrade;
  podeEditar: boolean;
  ehVoce: boolean;
}) {
  const [processando, iniciar] = useTransition();
  const [editando, setEditando] = useState(false);

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

      <Card className={cn(membro.ativo || "opacity-60")}>
        <CardContent className="flex gap-4 pt-6">
          <AvatarMembro
            nome={membro.nome}
            fotoUrl={membro.fotoUrl}
            tamanho="lg"
          />

          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-medium">
                  {membro.nome}
                  {ehVoce ? (
                    <span className="text-muted-foreground font-normal">
                      {" "}
                      · você
                    </span>
                  ) : null}
                </p>
                <p className="text-muted-foreground truncate text-sm">
                  {membro.email}
                </p>
              </div>

              {podeEditar ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="-mt-1 shrink-0"
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
                      Reenviar convite
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
              ) : null}
            </div>

            <div className="flex flex-wrap gap-1.5">
              <Badge
                variant={membro.cargo === "CHEFE" ? "default" : "secondary"}
              >
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
          </div>
        </CardContent>
      </Card>
    </>
  );
}
