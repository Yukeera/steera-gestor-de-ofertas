"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { atualizarMeuNome } from "@/actions/equipe";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function FormularioNome({ nomeAtual }: { nomeAtual: string }) {
  const [nome, setNome] = useState(nomeAtual);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, iniciar] = useTransition();

  const mudou = nome.trim() !== nomeAtual;

  function aoEnviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);

    const dados = new FormData(evento.currentTarget);

    iniciar(async () => {
      const resultado = await atualizarMeuNome(dados);
      if (resultado.ok) toast.success("Nome atualizado.");
      else setErro(resultado.erro);
    });
  }

  return (
    <form onSubmit={aoEnviar} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="nome">Nome</Label>
        <Input
          id="nome"
          name="nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          autoComplete="name"
          required
          aria-invalid={erro ? true : undefined}
          aria-describedby={erro ? "erro-nome" : undefined}
        />
        {erro ? (
          <p id="erro-nome" role="alert" className="text-destructive text-sm">
            {erro}
          </p>
        ) : null}
      </div>

      <Button type="submit" disabled={salvando || !mudou}>
        {salvando ? (
          <>
            <Loader2 className="animate-spin" aria-hidden="true" />
            Salvando…
          </>
        ) : (
          "Salvar nome"
        )}
      </Button>
    </form>
  );
}
