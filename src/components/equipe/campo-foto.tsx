"use client";

import { useRef, useState, useTransition } from "react";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { atualizarFoto } from "@/actions/equipe";
import { AvatarMembro } from "@/components/equipe/avatar-membro";
import { Button } from "@/components/ui/button";

const LADO = 400;
const TIPOS_ACEITOS = "image/jpeg,image/png,image/webp";

/**
 * Recorta no centro e redimensiona para 400×400 antes de subir.
 *
 * Feito no navegador de propósito: evita uma dependência de processamento de
 * imagem no servidor e, principalmente, evita mandar 8 MB de foto de celular
 * pela rede para guardar um avatar de 400px (RNF-07).
 */
async function prepararImagem(arquivo: File): Promise<File> {
  const bitmap = await createImageBitmap(arquivo);

  const lado = Math.min(bitmap.width, bitmap.height);
  const origemX = (bitmap.width - lado) / 2;
  const origemY = (bitmap.height - lado) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = LADO;
  canvas.height = LADO;

  const contexto = canvas.getContext("2d");
  if (!contexto) throw new Error("O navegador não conseguiu processar a imagem.");

  contexto.drawImage(bitmap, origemX, origemY, lado, lado, 0, 0, LADO, LADO);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolver) =>
    canvas.toBlob(resolver, "image/webp", 0.9),
  );

  if (!blob) throw new Error("O navegador não conseguiu processar a imagem.");

  return new File([blob], "foto.webp", { type: "image/webp" });
}

export function CampoFoto({
  membroId,
  nome,
  fotoUrl,
}: {
  membroId: string;
  nome: string;
  fotoUrl: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previa, setPrevia] = useState<string | null>(null);
  const [enviando, iniciarEnvio] = useTransition();

  function aoEscolher(evento: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0];
    // Limpa o input para que escolher o mesmo arquivo de novo dispare o change.
    evento.target.value = "";
    if (!arquivo) return;

    iniciarEnvio(async () => {
      try {
        const preparada = await prepararImagem(arquivo);

        // Prévia otimista: a foto nova aparece antes da ida ao servidor.
        setPrevia(URL.createObjectURL(preparada));

        const dados = new FormData();
        dados.set("foto", preparada);

        const resultado = await atualizarFoto(membroId, dados);

        if (resultado.ok) {
          toast.success("Foto atualizada.");
        } else {
          setPrevia(null);
          toast.error(resultado.erro);
        }
      } catch (erro) {
        setPrevia(null);
        toast.error(
          erro instanceof Error ? erro.message : "Não foi possível ler a imagem.",
        );
      }
    });
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <AvatarMembro nome={nome} fotoUrl={previa ?? fotoUrl} tamanho="xl" />
        {enviando ? (
          <div className="bg-background/70 absolute inset-0 flex items-center justify-center rounded-full">
            <Loader2 className="size-5 animate-spin" aria-hidden="true" />
          </div>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={enviando}
          onClick={() => inputRef.current?.click()}
        >
          <Camera aria-hidden="true" />
          {fotoUrl || previa ? "Trocar foto" : "Enviar foto"}
        </Button>
        <p className="text-muted-foreground text-xs">
          JPG, PNG ou WebP. A imagem é recortada no centro, em 400×400.
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={TIPOS_ACEITOS}
        className="sr-only"
        aria-label="Escolher foto de perfil"
        onChange={aoEscolher}
      />
    </div>
  );
}
