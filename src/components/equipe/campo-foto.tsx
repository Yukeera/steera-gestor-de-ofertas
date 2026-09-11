"use client";

import { useRef, useState, useTransition } from "react";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { atualizarFoto } from "@/actions/equipe";
import { AvatarMembro } from "@/components/equipe/avatar-membro";
import { Button } from "@/components/ui/button";
import { prepararQuadrado, TIPOS_DE_IMAGEM } from "@/lib/imagem";

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
        const preparada = await prepararQuadrado(arquivo);

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
        accept={TIPOS_DE_IMAGEM}
        className="sr-only"
        aria-label="Escolher foto de perfil"
        onChange={aoEscolher}
      />
    </div>
  );
}
