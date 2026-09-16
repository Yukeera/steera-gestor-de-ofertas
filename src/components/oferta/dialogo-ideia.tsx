"use client";

import { useState, useTransition } from "react";
import { Loader2, Lightbulb } from "lucide-react";
import { toast } from "sonner";

import { atualizarIdeia, criarIdeia } from "@/actions/peneira";
import {
  CampoImagens,
  type ImagemEscolhida,
} from "@/components/oferta/campo-imagens";
import { CampoLinks } from "@/components/oferta/campo-links";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatarWhatsapp } from "@/lib/whatsapp";

export type IdeiaEditavel = {
  id: string;
  nome: string;
  descricao: string;
  anuncianteReferencia: string | null;
  urlReferencia: string | null;
  nicho: string | null;
  capaUrl: string | null;
  whatsappFunil: string | null;
  /** Links dos criativos que inspiraram a ideia. */
  criativos: string[];
};

export function DialogoIdeia({
  ideia,
  gatilho,
  aberto: abertoControlado,
  aoAlternar,
}: {
  ideia?: IdeiaEditavel;
  gatilho?: React.ReactNode;
  /**
   * Modo controlado. Necessário quando o gatilho é um item de menu: um Dialog
   * renderizado dentro de um DropdownMenu do Radix é desmontado junto com o
   * menu e nunca chega a aparecer. Nesse caso o card guarda o estado e
   * renderiza este diálogo como irmão do menu, não como filho.
   */
  aberto?: boolean;
  aoAlternar?: (aberto: boolean) => void;
}) {
  const editando = Boolean(ideia);
  const controlado = abertoControlado !== undefined;

  const [abertoLocal, setAbertoLocal] = useState(false);
  const aberto = controlado ? abertoControlado : abertoLocal;

  const [erro, setErro] = useState<string | null>(null);
  const [salvando, iniciar] = useTransition();

  const [capa, setCapa] = useState<ImagemEscolhida[]>([]);
  const [criativos, setCriativos] = useState<string[]>(ideia?.criativos ?? []);

  function setAberto(novoEstado: boolean) {
    if (controlado) aoAlternar?.(novoEstado);
    else setAbertoLocal(novoEstado);
  }

  function aoMudarAbertura(novoEstado: boolean) {
    if (novoEstado) {
      setCapa([]);
      setCriativos(ideia?.criativos ?? []);
      setErro(null);
    }
    setAberto(novoEstado);
  }

  function aoEnviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);

    const dados = new FormData(evento.currentTarget);
    if (capa[0]) dados.set("capa", capa[0].arquivo);
    for (const link of criativos) dados.append("criativos", link);

    iniciar(async () => {
      const resultado = ideia
        ? await atualizarIdeia(ideia.id, dados)
        : await criarIdeia(dados);

      if (resultado.ok) {
        toast.success(
          editando ? "Ideia atualizada." : "Ideia guardada na Peneira.",
        );
        setAberto(false);
      } else {
        setErro(resultado.erro);
      }
    });
  }

  return (
    <Dialog open={aberto} onOpenChange={aoMudarAbertura}>
      {controlado ? null : (
        <DialogTrigger asChild>
          {gatilho ?? (
            <Button>
              <Lightbulb aria-hidden="true" />
              Nova ideia
            </Button>
          )}
        </DialogTrigger>
      )}

      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {editando ? `Editar "${ideia!.nome}"` : "Nova ideia"}
          </DialogTitle>
          <DialogDescription>
            O que você escrever aqui acompanha a oferta até o Painel, sem
            recadastro.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={aoEnviar} className="space-y-5" noValidate>
          <div className="space-y-2">
            <Label htmlFor="nome">Nome da oferta</Label>
            <Input
              id="nome"
              name="nome"
              defaultValue={ideia?.nome}
              placeholder="Ex.: Detox Turbo 30 dias"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">O que o produto oferece</Label>
            <Textarea
              id="descricao"
              name="descricao"
              defaultValue={ideia?.descricao}
              rows={4}
              placeholder="A promessa, o público e o que entrega."
              required
              aria-describedby="ajuda-descricao"
            />
            <p id="ajuda-descricao" className="text-muted-foreground text-xs">
              É esta descrição que a equipe vai ler no dia da montagem.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="anunciante_referencia">
                Anunciante de referência
              </Label>
              <Input
                id="anunciante_referencia"
                name="anunciante_referencia"
                defaultValue={ideia?.anuncianteReferencia ?? ""}
                placeholder="@perfil ou nome"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nicho">Nicho</Label>
              <Input
                id="nicho"
                name="nicho"
                defaultValue={ideia?.nicho ?? ""}
                placeholder="Ex.: emagrecimento"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="url_referencia">Link da referência</Label>
            <Input
              id="url_referencia"
              name="url_referencia"
              type="url"
              inputMode="url"
              defaultValue={ideia?.urlReferencia ?? ""}
              placeholder="https://…"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="whatsapp_funil">WhatsApp do funil</Label>
            <Input
              id="whatsapp_funil"
              name="whatsapp_funil"
              type="tel"
              inputMode="tel"
              autoComplete="off"
              defaultValue={
                ideia?.whatsappFunil
                  ? formatarWhatsapp(ideia.whatsappFunil)
                  : ""
              }
              placeholder="(11) 99999-8888"
              aria-describedby="ajuda-whatsapp"
            />
            <p id="ajuda-whatsapp" className="text-muted-foreground text-xs">
              O número para onde o anúncio manda. Costuma só existir depois da
              montagem — dá para preencher na tela da oferta.
            </p>
          </div>

          <CampoImagens
            rotulo="Imagem de capa"
            ajuda="Aparece nos cards e na galeria do Painel. Se não enviar, entra um marcador até a geração por IA existir."
            valor={capa}
            aoMudar={setCapa}
            previaExistente={ideia?.capaUrl}
          />

          <CampoLinks
            rotulo="Criativos de referência"
            ajuda="Os anúncios que inspiraram a ideia, na biblioteca de anúncios. Cole um por vez."
            marcador="https://facebook.com/ads/library/?id=…"
            valor={criativos}
            aoMudar={setCriativos}
          />

          {erro ? (
            <p role="alert" className="text-destructive text-sm">
              {erro}
            </p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setAberto(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={salvando}>
              {salvando ? (
                <>
                  <Loader2 className="animate-spin" aria-hidden="true" />
                  Salvando…
                </>
              ) : editando ? (
                "Salvar"
              ) : (
                "Guardar na Peneira"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
