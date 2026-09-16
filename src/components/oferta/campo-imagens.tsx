"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  prepararProporcional,
  TIPOS_DE_IMAGEM,
} from "@/lib/imagem";

export type ImagemEscolhida = {
  arquivo: File;
  previa: string;
};

/**
 * Escolha de imagens com prévia.
 *
 * As imagens ficam no estado do componente e só sobem junto com o formulário:
 * uma ideia sem nome ainda não é uma oferta, e enviar arquivo antes disso
 * deixaria lixo no Storage se a pessoa desistir.
 */
export function CampoImagens({
  rotulo,
  ajuda,
  valor,
  aoMudar,
  previaExistente,
}: {
  rotulo: string;
  ajuda?: string;
  valor: ImagemEscolhida[];
  aoMudar: (imagens: ImagemEscolhida[]) => void;
  /** URL já salva no servidor, exibida enquanto nada novo é escolhido. */
  previaExistente?: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [processando, setProcessando] = useState(false);

  async function aoEscolher(evento: React.ChangeEvent<HTMLInputElement>) {
    const arquivos = [...(evento.target.files ?? [])];
    evento.target.value = "";
    if (arquivos.length === 0) return;

    setProcessando(true);
    try {
      const preparadas = await Promise.all(
        arquivos.map(async (arquivo) => {
          const reduzida = await prepararProporcional(arquivo);
          return { arquivo: reduzida, previa: URL.createObjectURL(reduzida) };
        }),
      );

      aoMudar(preparadas.slice(0, 1));
    } catch {
      toast.error("Não foi possível ler uma das imagens.");
    } finally {
      setProcessando(false);
    }
  }

  function remover(indice: number) {
    URL.revokeObjectURL(valor[indice].previa);
    aoMudar(valor.filter((_, i) => i !== indice));
  }

  const mostrarExistente = valor.length === 0 && previaExistente;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{rotulo}</span>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={processando}
          onClick={() => inputRef.current?.click()}
        >
          {processando ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <ImagePlus aria-hidden="true" />
          )}
          {valor.length > 0 ? "Trocar" : "Escolher"}
        </Button>
      </div>

      {ajuda ? <p className="text-muted-foreground text-xs">{ajuda}</p> : null}

      {(valor.length > 0 || mostrarExistente) && (
        <ul className="grid grid-cols-1 gap-2">
          {mostrarExistente ? (
            <li className="bg-muted relative aspect-video overflow-hidden rounded-md border">
              {/* eslint-disable-next-line @next/next/no-img-element -- URL assinada e efêmera do Storage; next/image exigiria configurar o host a cada projeto Supabase */}
              <img
                src={previaExistente}
                alt=""
                className="absolute inset-0 size-full object-cover"
              />
            </li>
          ) : null}

          {valor.map((imagem, indice) => (
            <li
              key={imagem.previa}
              className="bg-muted relative aspect-video overflow-hidden rounded-md border"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- blob local da prévia, não passa por otimização */}
              <img
                src={imagem.previa}
                alt=""
                className="absolute inset-0 size-full object-cover"
              />
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="absolute top-1 right-1 size-7"
                onClick={() => remover(indice)}
              >
                <X className="size-3.5" aria-hidden="true" />
                <span className="sr-only">Remover imagem {indice + 1}</span>
              </Button>
            </li>
          ))}
        </ul>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={TIPOS_DE_IMAGEM}
        className="sr-only"
        aria-label={rotulo}
        onChange={aoEscolher}
      />
    </div>
  );
}
