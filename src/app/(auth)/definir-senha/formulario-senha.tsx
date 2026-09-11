"use client";

import { useActionState, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";

import { definirSenha, type EstadoFormulario } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function FormularioSenha() {
  const [estado, acao, enviando] = useActionState<EstadoFormulario, FormData>(
    definirSenha,
    {},
  );

  const senhaRef = useRef<HTMLInputElement>(null);
  const confirmacaoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!estado.erro) return;
    if (estado.campo === "confirmacao") confirmacaoRef.current?.focus();
    else senhaRef.current?.focus();
  }, [estado]);

  return (
    <form action={acao} className="space-y-5" noValidate>
      <div className="space-y-2">
        <Label htmlFor="senha">Sua senha</Label>
        <Input
          ref={senhaRef}
          id="senha"
          name="senha"
          type="password"
          autoComplete="new-password"
          autoFocus
          required
          minLength={8}
          aria-invalid={estado.campo === "senha" || undefined}
          aria-describedby="ajuda-senha"
        />
        <p id="ajuda-senha" className="text-muted-foreground text-xs">
          Ao menos 8 caracteres.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmacao">Repita a senha</Label>
        <Input
          ref={confirmacaoRef}
          id="confirmacao"
          name="confirmacao"
          type="password"
          autoComplete="new-password"
          required
          aria-invalid={estado.campo === "confirmacao" || undefined}
          aria-describedby={estado.erro ? "erro-senha" : undefined}
        />
      </div>

      {estado.erro ? (
        <p
          id="erro-senha"
          role="alert"
          className="text-destructive text-sm leading-relaxed"
        >
          {estado.erro}
        </p>
      ) : null}

      <Button type="submit" className="w-full" disabled={enviando}>
        {enviando ? (
          <>
            <Loader2 className="animate-spin" aria-hidden="true" />
            Salvando…
          </>
        ) : (
          "Definir senha e entrar"
        )}
      </Button>
    </form>
  );
}
