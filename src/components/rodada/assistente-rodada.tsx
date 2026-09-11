"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  ImageOff,
  Loader2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { criarRodada } from "@/actions/rodadas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cronograma } from "@/lib/agenda";
import { formatarDataPorExtenso } from "@/lib/data";
import { cn } from "@/lib/utils";

export type OfertaDisponivel = {
  id: string;
  nome: string;
  descricao: string;
  nicho: string | null;
  capaUrl: string | null;
};

export type RoteiroDisponivel = {
  id: string;
  nome: string;
  ePadrao: boolean;
  quantidadeEtapas: number;
};

const PASSOS = ["Identificação", "Ofertas", "Roteiro e prévia"] as const;

export function AssistenteRodada({
  ofertasDisponiveis,
  roteiros,
  feriados,
  nomeSugerido,
  dataSugerida,
}: {
  ofertasDisponiveis: OfertaDisponivel[];
  roteiros: RoteiroDisponivel[];
  feriados: string[];
  nomeSugerido: string;
  dataSugerida: string;
}) {
  const router = useRouter();
  const [passo, setPasso] = useState(0);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, iniciar] = useTransition();

  const roteiroPadrao =
    roteiros.find((r) => r.ePadrao)?.id ?? roteiros[0]?.id ?? "";

  const [nome, setNome] = useState(nomeSugerido);
  const [dataInicio, setDataInicio] = useState(dataSugerida);
  const [observacoes, setObservacoes] = useState("");

  /** Ids na ordem da esteira. A ordem de seleção é a ordem dos dias. */
  const [selecionadas, setSelecionadas] = useState<string[]>([]);
  const [roteiroPorOferta, setRoteiroPorOferta] = useState<
    Record<string, string>
  >({});

  const porId = useMemo(
    () => new Map(ofertasDisponiveis.map((o) => [o.id, o])),
    [ofertasDisponiveis],
  );

  // RF-04.4: a prévia recalcula a cada mudança, sem ida ao servidor.
  const datas = useMemo(
    () => cronograma(dataInicio, selecionadas.length, feriados),
    [dataInicio, selecionadas.length, feriados],
  );

  function alternarOferta(id: string) {
    setSelecionadas((atuais) =>
      atuais.includes(id)
        ? atuais.filter((x) => x !== id)
        : [...atuais, id],
    );
    setRoteiroPorOferta((atuais) =>
      atuais[id] ? atuais : { ...atuais, [id]: roteiroPadrao },
    );
  }

  function mover(indice: number, direcao: -1 | 1) {
    const destino = indice + direcao;
    if (destino < 0 || destino >= selecionadas.length) return;

    setSelecionadas((atuais) => {
      const copia = [...atuais];
      [copia[indice], copia[destino]] = [copia[destino], copia[indice]];
      return copia;
    });
  }

  const podeAvancar =
    passo === 0
      ? nome.trim().length >= 2 && Boolean(dataInicio)
      : passo === 1
        ? selecionadas.length > 0
        : true;

  function salvar() {
    setErro(null);

    iniciar(async () => {
      const resultado = await criarRodada({
        nome,
        dataInicio,
        observacoes,
        ofertas: selecionadas.map((id) => ({
          oferta_id: id,
          roteiro_id: roteiroPorOferta[id] ?? roteiroPadrao,
        })),
      });

      if (resultado.ok && resultado.id) {
        toast.success(
          `Rodada montada. ${selecionadas.length} oferta(s) entraram na esteira.`,
        );
        router.push(`/rodadas/${resultado.id}`);
      } else if (!resultado.ok) {
        setErro(resultado.erro);
        // O erro quase sempre é sobre uma oferta específica: voltar para a
        // seleção é onde a pessoa consegue resolver.
        setPasso(1);
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* `multi-step-progress`: onde estou, quantos faltam. */}
      <ol className="flex flex-wrap gap-2" aria-label="Etapas do assistente">
        {PASSOS.map((rotulo, i) => (
          <li key={rotulo} className="flex items-center gap-2">
            <span
              aria-current={i === passo ? "step" : undefined}
              className={cn(
                "flex items-center gap-2 rounded-full px-3 py-1 text-sm",
                i === passo && "bg-marca text-marca-foreground font-medium",
                i < passo && "text-muted-foreground",
                i > passo && "text-muted-foreground opacity-60",
              )}
            >
              <span className="font-mono text-xs tabular">
                {i < passo ? <Check className="size-3.5" /> : i + 1}
              </span>
              {rotulo}
            </span>
          </li>
        ))}
      </ol>

      {passo === 0 ? (
        <Card>
          <CardContent className="max-w-lg space-y-5">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome da Rodada</Label>
              <Input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex.: Rodada #12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="data">Primeiro dia na esteira</Label>
              <Input
                id="data"
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                aria-describedby="ajuda-data"
              />
              <p id="ajuda-data" className="text-muted-foreground text-xs">
                Cair em fim de semana ou feriado não é problema: a primeira
                oferta entra no próximo dia útil.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="obs">Observações</Label>
              <Textarea
                id="obs"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                rows={3}
                placeholder="Contexto desta Rodada (opcional)."
              />
            </div>
          </CardContent>
        </Card>
      ) : null}

      {passo === 1 ? (
        <div className="space-y-4">
          <p className="text-muted-foreground text-sm">
            A ordem em que você marcar é a ordem dos dias. Dá para reordenar
            depois, na lista ao lado.
          </p>

          {ofertasDisponiveis.length === 0 ? (
            <Card className="border-dashed shadow-none">
              <CardContent className="py-12 text-center">
                <p className="font-medium">A Peneira está vazia</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  Só entra em Rodada o que está na Peneira. Cadastre ideias
                  primeiro.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
              <ul className="grid gap-3 sm:grid-cols-2">
                {ofertasDisponiveis.map((oferta) => {
                  const marcada = selecionadas.includes(oferta.id);
                  const posicao = selecionadas.indexOf(oferta.id) + 1;

                  return (
                    <li key={oferta.id}>
                      <label
                        className={cn(
                          "flex h-full cursor-pointer gap-3 rounded-lg border p-3 transition-colors",
                          marcada
                            ? "border-marca bg-marca/5"
                            : "hover:bg-accent/50",
                        )}
                      >
                        <Checkbox
                          checked={marcada}
                          onCheckedChange={() => alternarOferta(oferta.id)}
                          className="mt-0.5"
                        />
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-sm leading-tight font-medium">
                              {oferta.nome}
                            </span>
                            {marcada ? (
                              <Badge className="shrink-0 tabular">
                                {posicao}º
                              </Badge>
                            ) : null}
                          </div>
                          <p className="text-muted-foreground line-clamp-2 text-xs leading-relaxed">
                            {oferta.descricao}
                          </p>
                          {oferta.nicho ? (
                            <span className="text-muted-foreground text-xs">
                              {oferta.nicho}
                            </span>
                          ) : null}
                        </div>
                      </label>
                    </li>
                  );
                })}
              </ul>

              <Card className="h-fit lg:sticky lg:top-20">
                <CardContent className="space-y-3">
                  <p className="text-sm font-medium">
                    Ordem na esteira{" "}
                    <span className="text-muted-foreground font-normal tabular">
                      ({selecionadas.length})
                    </span>
                  </p>

                  {selecionadas.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      Nada escolhido ainda.
                    </p>
                  ) : (
                    <ol className="space-y-1.5">
                      {selecionadas.map((id, i) => (
                        <li
                          key={id}
                          className="flex items-center gap-1.5 text-sm"
                        >
                          <span className="text-muted-foreground w-4 font-mono text-xs tabular">
                            {i + 1}
                          </span>
                          <span className="min-w-0 flex-1 truncate">
                            {porId.get(id)?.nome}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-6"
                            disabled={i === 0}
                            onClick={() => mover(i, -1)}
                          >
                            <ChevronUp className="size-3.5" aria-hidden="true" />
                            <span className="sr-only">
                              Subir {porId.get(id)?.nome}
                            </span>
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-6"
                            disabled={i === selecionadas.length - 1}
                            onClick={() => mover(i, 1)}
                          >
                            <ChevronDown
                              className="size-3.5"
                              aria-hidden="true"
                            />
                            <span className="sr-only">
                              Descer {porId.get(id)?.nome}
                            </span>
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-destructive size-6"
                            onClick={() => alternarOferta(id)}
                          >
                            <X className="size-3.5" aria-hidden="true" />
                            <span className="sr-only">
                              Tirar {porId.get(id)?.nome}
                            </span>
                          </Button>
                        </li>
                      ))}
                    </ol>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      ) : null}

      {passo === 2 ? (
        <Card>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-sm">
              Cada oferta já vem com o roteiro padrão. Troque só onde precisar.
            </p>

            <ol className="divide-y">
              {selecionadas.map((id, i) => {
                const oferta = porId.get(id);
                return (
                  <li
                    key={id}
                    className="flex flex-wrap items-center gap-3 py-3"
                  >
                    <div className="bg-muted relative size-12 shrink-0 overflow-hidden rounded">
                      {oferta?.capaUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- URL assinada e efêmera do Storage privado
                        <img
                          src={oferta.capaUrl}
                          alt=""
                          className="absolute inset-0 size-full object-cover"
                        />
                      ) : (
                        <ImageOff
                          className="text-muted-foreground absolute inset-0 m-auto size-4"
                          aria-hidden="true"
                        />
                      )}
                    </div>

                    <div className="min-w-40 flex-1">
                      <p className="text-sm font-medium">{oferta?.nome}</p>
                      <p className="text-muted-foreground text-xs tabular">
                        {datas[i] ? formatarDataPorExtenso(datas[i]) : "—"}
                      </p>
                    </div>

                    <Select
                      value={roteiroPorOferta[id] ?? roteiroPadrao}
                      onValueChange={(v) =>
                        setRoteiroPorOferta((atuais) => ({
                          ...atuais,
                          [id]: v,
                        }))
                      }
                    >
                      <SelectTrigger
                        className="w-56"
                        aria-label={`Roteiro de ${oferta?.nome}`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {roteiros.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.nome} ({r.quantidadeEtapas})
                            {r.ePadrao ? " · padrão" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </li>
                );
              })}
            </ol>
          </CardContent>
        </Card>
      ) : null}

      {erro ? (
        <p role="alert" className="text-destructive text-sm leading-relaxed">
          {erro}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="secondary"
          disabled={passo === 0 || salvando}
          onClick={() => setPasso((p) => p - 1)}
        >
          <ArrowLeft aria-hidden="true" />
          Voltar
        </Button>

        {passo < PASSOS.length - 1 ? (
          <Button
            type="button"
            disabled={!podeAvancar}
            onClick={() => setPasso((p) => p + 1)}
          >
            Avançar
            <ArrowRight aria-hidden="true" />
          </Button>
        ) : (
          <Button type="button" onClick={salvar} disabled={salvando}>
            {salvando ? (
              <>
                <Loader2 className="animate-spin" aria-hidden="true" />
                Montando…
              </>
            ) : (
              `Montar Rodada com ${selecionadas.length} oferta${selecionadas.length === 1 ? "" : "s"}`
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
