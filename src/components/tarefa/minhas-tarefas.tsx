"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Cog, ListChecks } from "lucide-react";
import { toast } from "sonner";

import { alternarEtapa } from "@/actions/etapas";
import { concluirTarefa } from "@/actions/tarefas";
import { Checkbox } from "@/components/ui/checkbox";
import { rotuloDePrazo } from "@/lib/data";
import { cn } from "@/lib/utils";

export type ItemDeTrabalho = {
  chave: string;
  id: string;
  titulo: string;
  origem: "etapa" | "tarefa";
  /** A oferta a que o item pertence, quando há uma. */
  contexto: { id: string; nome: string } | null;
  data: string | null;
  alta: boolean;
  atrasado: boolean;
  hoje: boolean;
};

/**
 * A fila de trabalho da pessoa (RF-06.7).
 *
 * Etapas de oferta e tarefas individuais numa lista só, porque para quem
 * executa são a mesma coisa: algo aberto no meu nome, com uma data.
 *
 * A caixa de conclusão fica aqui de propósito. Todo item desta lista já é da
 * pessoa — é esse o critério que a monta —, então ela pode concluir sem abrir
 * a oferta. Obrigar a navegar até a oferta para marcar uma etapa transforma
 * dois cliques em cinco, várias vezes por dia.
 */
export function MinhasTarefas({ itens }: { itens: ItemDeTrabalho[] }) {
  const router = useRouter();
  const [concluidos, setConcluidos] = useState<Set<string>>(new Set());

  function concluir(item: ItemDeTrabalho) {
    // Otimista: com ~400ms de ida e volta, esperar o servidor para riscar a
    // linha faria a lista parecer travada.
    setConcluidos((atuais) => new Set(atuais).add(item.chave));

    const acao =
      item.origem === "etapa"
        ? alternarEtapa(item.id, item.contexto?.id ?? "", true)
        : concluirTarefa(item.id, true);

    void acao.then((resultado) => {
      if (resultado.ok) {
        toast.success("Feito.");
        router.refresh();
      } else {
        setConcluidos((atuais) => {
          const copia = new Set(atuais);
          copia.delete(item.chave);
          return copia;
        });
        toast.error(resultado.erro, { duration: 6000 });
      }
    });
  }

  if (itens.length === 0) {
    return (
      <div className="rounded-xl border border-dashed px-6 py-10 text-center">
        <ListChecks
          className="text-muted-foreground mx-auto size-7"
          aria-hidden="true"
        />
        <p className="mt-2 font-medium">Sua fila está limpa</p>
        <p className="text-muted-foreground mx-auto mt-1 max-w-sm text-sm leading-relaxed">
          Etapas de oferta e tarefas designadas a você aparecem aqui, juntas e
          ordenadas por data.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {itens.map((item, indice) => {
        const feito = concluidos.has(item.chave);
        const Icone = item.origem === "etapa" ? Cog : ListChecks;

        // O prazo é o que ordena a atenção, então é ele que ganha a cor.
        const corDoPrazo = item.atrasado
          ? "var(--status-atrasada)"
          : item.hoje
            ? "var(--status-esteira)"
            : undefined;

        return (
          <li
            key={item.chave}
            className={cn(
              "cartao-vivo entra bg-card relative flex items-start gap-3 overflow-hidden rounded-lg border p-3 pl-4",
              feito && "opacity-50",
            )}
            style={{ "--i": indice } as React.CSSProperties}
          >
            {/* Filete de urgência na borda. Acompanhado do rótulo de prazo em
                texto, nunca sozinho. */}
            <span
              aria-hidden="true"
              className="absolute inset-y-0 left-0 w-1"
              style={{ background: corDoPrazo ?? "var(--border)" }}
            />

            <label className="flex min-h-9 cursor-pointer items-center pt-0.5">
              <Checkbox
                checked={feito}
                disabled={feito}
                onCheckedChange={(m) => m === true && concluir(item)}
                aria-label={`Concluir: ${item.titulo}`}
              />
            </label>

            <div className="min-w-0 flex-1 space-y-1">
              <p
                className={cn(
                  "text-sm leading-snug font-medium",
                  feito && "text-muted-foreground line-through",
                )}
              >
                {item.titulo}
              </p>

              <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                <span className="flex items-center gap-1">
                  <Icone className="size-3" aria-hidden="true" />
                  {item.origem}
                </span>

                {item.contexto ? (
                  <>
                    <span aria-hidden="true">·</span>
                    <Link
                      href={`/ofertas/${item.contexto.id}`}
                      className="max-w-48 truncate underline-offset-4 hover:underline"
                    >
                      {item.contexto.nome}
                    </Link>
                  </>
                ) : null}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {item.alta ? (
                <span
                  className="rounded-full border px-2 py-0.5 text-[11px] font-medium"
                  style={{
                    color: "var(--status-atrasada)",
                    borderColor:
                      "color-mix(in oklab, var(--status-atrasada) 40%, transparent)",
                  }}
                >
                  Alta
                </span>
              ) : null}

              {item.data ? (
                <time
                  dateTime={item.data}
                  className="text-xs font-medium tabular"
                  style={{ color: corDoPrazo ?? "var(--muted-foreground)" }}
                >
                  {rotuloDePrazo(item.data)}
                </time>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
