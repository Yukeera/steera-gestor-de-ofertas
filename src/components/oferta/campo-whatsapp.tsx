"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, MessageCircle, Pencil, X } from "lucide-react";
import { toast } from "sonner";

import { definirWhatsappFunil } from "@/actions/ofertas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatarWhatsapp, linkWhatsapp } from "@/lib/whatsapp";

/**
 * O WhatsApp do funil, na tela da oferta.
 *
 * Edita no lugar em vez de abrir diálogo: é um campo só, e quem acabou de
 * publicar o funil está com o número na mão — abrir modal para colar um
 * telefone seria cerimônia demais.
 *
 * Quando está preenchido, o número é um link `wa.me`: conferir se o funil
 * responde é o motivo de guardar isso aqui, e ninguém deveria ter que copiar,
 * salvar contato e procurar na agenda para fazer esse teste.
 */
export function CampoWhatsapp({
  ofertaId,
  numero,
}: {
  ofertaId: string;
  numero: string | null;
}) {
  const [editando, setEditando] = useState(false);
  const [rascunho, setRascunho] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, iniciar] = useTransition();

  function abrir() {
    setRascunho(numero ? formatarWhatsapp(numero) : "");
    setErro(null);
    setEditando(true);
  }

  function salvar() {
    setErro(null);
    iniciar(async () => {
      const resultado = await definirWhatsappFunil(ofertaId, rascunho);

      if (resultado.ok) {
        toast.success(
          rascunho.trim() ? "WhatsApp do funil salvo." : "WhatsApp removido.",
        );
        setEditando(false);
      } else {
        setErro(resultado.erro);
      }
    });
  }

  if (!editando) {
    return (
      <div className="flex items-center gap-2">
        {numero ? (
          <a
            href={linkWhatsapp(numero)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 underline underline-offset-4"
          >
            <MessageCircle className="size-3.5 shrink-0" aria-hidden="true" />
            {formatarWhatsapp(numero)}
            <span className="sr-only"> (abre a conversa em nova aba)</span>
          </a>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={abrir}
        >
          <Pencil className="size-3.5" aria-hidden="true" />
          <span className="sr-only">
            {numero ? "Alterar o WhatsApp do funil" : "Definir o WhatsApp do funil"}
          </span>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Input
          autoFocus
          value={rascunho}
          onChange={(evento) => {
            setRascunho(evento.target.value);
            if (erro) setErro(null);
          }}
          // Enter salva, Esc desiste: é um campo dentro de uma página, não um
          // formulário — sem isto o teclado não teria como concluir.
          onKeyDown={(evento) => {
            if (evento.key === "Enter") {
              evento.preventDefault();
              salvar();
            }
            if (evento.key === "Escape") setEditando(false);
          }}
          type="tel"
          inputMode="tel"
          autoComplete="off"
          placeholder="(11) 99999-8888"
          aria-label="WhatsApp do funil"
          aria-invalid={erro ? true : undefined}
          className="h-8"
        />

        <Button
          type="button"
          size="icon"
          className="size-8 shrink-0"
          disabled={salvando}
          onClick={salvar}
        >
          {salvando ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Check className="size-3.5" aria-hidden="true" />
          )}
          <span className="sr-only">Salvar</span>
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 shrink-0"
          disabled={salvando}
          onClick={() => setEditando(false)}
        >
          <X className="size-3.5" aria-hidden="true" />
          <span className="sr-only">Cancelar</span>
        </Button>
      </div>

      {erro ? (
        <p role="alert" className="text-destructive text-xs">
          {erro}
        </p>
      ) : (
        <p className="text-muted-foreground text-xs">
          Só DDD e número já serve — o 55 entra sozinho. Apague para remover.
        </p>
      )}
    </div>
  );
}
