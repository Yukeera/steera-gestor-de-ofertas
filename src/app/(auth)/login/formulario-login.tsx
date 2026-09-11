"use client";

import { useActionState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import { entrar, type EstadoFormulario } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ERROS_DE_ROTA: Record<string, string> = {
  "sem-perfil":
    "Seu acesso ainda não foi liberado pelo Chefe. Procure quem te convidou.",
  inativo: "Seu acesso está desativado. Procure o Chefe da equipe.",
  // Códigos que o próprio Supabase devolve no link de e-mail.
  otp_expired:
    "Esse link já foi usado ou passou da validade. Peça ao Chefe para reenviar o convite — cada link vale uma vez só.",
  access_denied:
    "Esse link não é mais válido. Peça ao Chefe para reenviar o convite.",
  "link-invalido":
    "Esse link não é mais válido. Peça ao Chefe para reenviar o convite.",
};

const ERRO_PADRAO_DE_LINK =
  "Não foi possível validar esse link. Peça ao Chefe para reenviar o convite.";

export function FormularioLogin() {
  const parametros = useSearchParams();
  const proximo = parametros.get("proximo") ?? "/";
  const erroDeRota = parametros.get("erro");

  const [estado, acao, enviando] = useActionState<EstadoFormulario, FormData>(
    entrar,
    {},
  );

  const emailRef = useRef<HTMLInputElement>(null);
  const senhaRef = useRef<HTMLInputElement>(null);

  // `focus-management`: ao voltar com erro, o foco vai para o campo que falhou,
  // em vez de deixar a pessoa procurando o que deu errado.
  useEffect(() => {
    if (!estado.erro) return;
    if (estado.campo === "senha") senhaRef.current?.focus();
    else emailRef.current?.focus();
  }, [estado]);

  // Erro do formulário ganha do erro de rota: se a pessoa já tentou entrar,
  // o que importa é o resultado da tentativa, não o link velho que a trouxe.
  const mensagem =
    estado.erro ??
    (erroDeRota ? (ERROS_DE_ROTA[erroDeRota] ?? ERRO_PADRAO_DE_LINK) : null);

  return (
    <form action={acao} className="space-y-5" noValidate>
      <input type="hidden" name="proximo" value={proximo} />

      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input
          ref={emailRef}
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="username"
          autoFocus
          required
          aria-invalid={estado.campo === "email" || undefined}
          aria-describedby={mensagem ? "erro-login" : undefined}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="senha">Senha</Label>
        <Input
          ref={senhaRef}
          id="senha"
          name="senha"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={estado.campo === "senha" || undefined}
          aria-describedby={mensagem ? "erro-login" : undefined}
        />
      </div>

      {/* `aria-live-errors`: o leitor de tela anuncia sem precisar de foco. */}
      {mensagem ? (
        <p
          id="erro-login"
          role="alert"
          className="text-destructive text-sm leading-relaxed"
        >
          {mensagem}
        </p>
      ) : null}

      <Button type="submit" className="w-full" disabled={enviando}>
        {enviando ? (
          <>
            <Loader2 className="animate-spin" aria-hidden="true" />
            Entrando…
          </>
        ) : (
          "Entrar"
        )}
      </Button>
    </form>
  );
}
