"use client";

import { useState } from "react";
import { Check, Copy, KeyRound } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

/**
 * Mostra a senha provisória uma vez só.
 *
 * Não fica guardada em lugar nenhum legível: o Supabase só grava o hash. Se o
 * Chefe fechar sem copiar, o caminho é gerar outra — por isso o aviso é
 * enfático e o botão de copiar vem antes de qualquer outra ação.
 */
export function SenhaGerada({
  nome,
  email,
  senha,
  aoFechar,
}: {
  nome: string;
  email: string;
  senha: string;
  aoFechar: () => void;
}) {
  const [copiado, setCopiado] = useState(false);

  const mensagem = `Acesso ao Steera\n\nE-mail: ${email}\nSenha: ${senha}\n\nEntre e troque a senha em Meu perfil.`;

  async function copiar(texto: string, oQue: string) {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      toast.success(`${oQue} copiado.`);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      toast.error("O navegador bloqueou a cópia. Selecione e copie à mão.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <KeyRound
          className="text-marca mt-0.5 size-5 shrink-0"
          aria-hidden="true"
        />
        <div className="space-y-1">
          <p className="font-medium">Acesso de {nome} criado</p>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Esta senha <strong>não aparece de novo</strong>. Copie agora e mande
            para a pessoa pelo canal que vocês já usam.
          </p>
        </div>
      </div>

      <div className="bg-muted/50 space-y-3 rounded-lg border p-3">
        <div className="space-y-0.5">
          <p className="text-muted-foreground text-xs">E-mail</p>
          <p className="font-mono text-sm break-all">{email}</p>
        </div>

        <div className="space-y-0.5">
          <p className="text-muted-foreground text-xs">Senha provisória</p>
          <p className="font-mono text-lg font-semibold tracking-wide select-all">
            {senha}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => copiar(mensagem, "Mensagem")}>
          {copiado ? (
            <Check aria-hidden="true" />
          ) : (
            <Copy aria-hidden="true" />
          )}
          Copiar mensagem pronta
        </Button>
        <Button variant="secondary" onClick={() => copiar(senha, "Senha")}>
          Copiar só a senha
        </Button>
      </div>

      <p className="text-muted-foreground text-xs leading-relaxed">
        Peça para a pessoa trocar a senha em <strong>Meu perfil</strong> depois
        do primeiro acesso. Se ela perder esta, você gera outra pelo menu do card
        dela na Equipe.
      </p>

      <Button variant="ghost" className="w-full" onClick={aoFechar}>
        Já copiei, fechar
      </Button>
    </div>
  );
}
