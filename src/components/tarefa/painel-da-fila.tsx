"use client";

import { CheckCircle2 } from "lucide-react";

import {
  MinhasTarefas,
  type ItemDeTrabalho,
} from "@/components/tarefa/minhas-tarefas";
import { cn } from "@/lib/utils";

export type MinhaEtapaDeHoje = {
  id: string;
  ordem: number;
  titulo: string;
  concluida: boolean;
};

/**
 * A coluna lateral da tela Hoje.
 *
 * Não repete a checklist: aponta para ela. Os números são âncoras que rolam
 * até a etapa no Roteiro, à esquerda — a pessoa vê quais das oito são dela
 * sem precisar ler as oito, e marca num lugar só.
 *
 * O progresso aqui é o DELA, não o da oferta. São perguntas diferentes:
 * "quanto falta para a equipe fechar o dia" e "quanto falta do meu trabalho".
 */
export function PainelDaFila({
  minhasEtapas,
  itens,
}: {
  minhasEtapas: MinhaEtapaDeHoje[];
  itens: ItemDeTrabalho[];
}) {
  const feitas = minhasEtapas.filter((e) => e.concluida).length;
  const total = minhasEtapas.length;
  const tudoFeito = total > 0 && feitas === total;

  return (
    <div className="space-y-6">
      <section aria-labelledby="t-minhas-etapas" className="space-y-3">
        <h2
          id="t-minhas-etapas"
          className="text-muted-foreground text-xs font-medium tracking-wide uppercase"
        >
          Suas etapas de hoje
        </h2>

        {total === 0 ? (
          <div className="rounded-xl border border-dashed px-4 py-5 text-center">
            <p className="text-muted-foreground text-sm leading-relaxed">
              Nenhuma etapa da oferta de hoje está no seu nome.
            </p>
          </div>
        ) : (
          <div className="bg-card space-y-3 rounded-xl border p-4">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-mono text-2xl leading-none font-semibold tabular">
                {feitas}
                <span className="text-muted-foreground text-base">/{total}</span>
              </span>
              {tudoFeito ? (
                <span className="flex items-center gap-1 text-xs font-medium text-[color:var(--status-validada)]">
                  <CheckCircle2 className="size-3.5" aria-hidden="true" />
                  seu dia fechou
                </span>
              ) : (
                <span className="text-muted-foreground text-xs">
                  {total - feitas} para fechar
                </span>
              )}
            </div>

            <div
              className="flex gap-1"
              role="img"
              aria-label={`${feitas} de ${total} etapas suas concluídas.`}
            >
              {minhasEtapas.map((etapa) => (
                <span
                  key={etapa.id}
                  className={cn(
                    "h-1.5 flex-1 rounded-full",
                    etapa.concluida
                      ? "bg-[color:var(--status-validada)]"
                      : "bg-muted",
                  )}
                />
              ))}
            </div>

            {/* Âncoras para o Roteiro à esquerda. Nada de caixa aqui: marcar
                é lá, num lugar só. */}
            <ul className="flex flex-wrap gap-1.5">
              {minhasEtapas.map((etapa) => (
                <li key={etapa.id}>
                  <a
                    href={`#etapa-${etapa.ordem}`}
                    title={etapa.titulo}
                    className={cn(
                      "focus-visible:ring-ring flex size-8 items-center justify-center rounded-lg border font-mono text-xs tabular transition-colors focus-visible:ring-2 focus-visible:outline-none",
                      etapa.concluida
                        ? "text-muted-foreground border-transparent bg-[color:var(--status-validada)]/15 line-through"
                        : "hover:border-marca hover:text-marca",
                    )}
                  >
                    {etapa.ordem}
                    <span className="sr-only">
                      {" "}
                      — {etapa.titulo}
                      {etapa.concluida ? ", concluída" : ""}. Ir para a etapa.
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section aria-labelledby="t-fora-da-montagem" className="space-y-3">
        <div className="space-y-0.5">
          <h2
            id="t-fora-da-montagem"
            className="text-muted-foreground text-xs font-medium tracking-wide uppercase"
          >
            Fora da montagem
          </h2>
          <p className="text-muted-foreground text-xs">
            Tarefas suas e etapas de outros dias.
          </p>
        </div>

        <MinhasTarefas itens={itens} />
      </section>
    </div>
  );
}
