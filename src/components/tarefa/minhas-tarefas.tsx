"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, Cog, ListChecks } from "lucide-react";
import { toast } from "sonner";

import { alternarEtapa } from "@/actions/etapas";
import { concluirTarefa } from "@/actions/tarefas";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { rotuloDePrazo } from "@/lib/data";
import { cn } from "@/lib/utils";

export type ItemDeTrabalho = {
  chave: string;
  id: string;
  titulo: string;
  origem: "etapa" | "tarefa";
  contexto: { id: string; nome: string } | null;
  data: string | null;
  alta: boolean;
  atrasado: boolean;
  hoje: boolean;
};

function Linha({
  item,
  indice,
  feito,
  aoConcluir,
}: {
  item: ItemDeTrabalho;
  indice: number;
  feito: boolean;
  aoConcluir: () => void;
}) {
  const Icone = item.origem === "etapa" ? Cog : ListChecks;

  // O prazo é o que ordena a atenção, então é ele que ganha a cor.
  const corDoPrazo = item.atrasado
    ? "var(--status-atrasada)"
    : item.hoje
      ? "var(--status-esteira)"
      : undefined;

  return (
    <li
      className={cn(
        "cartao-vivo entra bg-card relative flex items-start gap-3 overflow-hidden rounded-lg border p-3 pl-4",
        feito && "opacity-50",
      )}
      style={{ "--i": indice } as React.CSSProperties}
    >
      {/* Filete de urgência. Acompanhado do prazo em texto, nunca sozinho. */}
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-1"
        style={{ background: corDoPrazo ?? "var(--border)" }}
      />

      <label className="flex min-h-9 cursor-pointer items-center pt-0.5">
        <Checkbox
          checked={feito}
          disabled={feito}
          onCheckedChange={(m) => m === true && aoConcluir()}
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
}

/**
 * A fila pessoal, do que sobra depois da montagem de hoje.
 *
 * O que é da oferta de hoje NÃO entra aqui: já está no Roteiro de Montagem,
 * logo acima, e a mesma etapa com caixa em dois lugares cria dúvida sobre
 * onde marcar. O Roteiro é o lugar da oferta do dia; esta lista é o resto.
 *
 * Abre em "atrasado e hoje". O que vem depois fica recolhido: planejar é útil,
 * mas não pode competir com o que é para agora.
 */
export function MinhasTarefas({ itens }: { itens: ItemDeTrabalho[] }) {
  const router = useRouter();
  const [concluidos, setConcluidos] = useState<Set<string>>(new Set());
  const [verProximos, setVerProximos] = useState(false);

  const agora = itens.filter((i) => i.atrasado || i.hoje);
  const proximos = itens.filter((i) => !i.atrasado && !i.hoje);

  function concluir(item: ItemDeTrabalho) {
    // Otimista: com ~400ms de ida e volta, esperar o servidor para riscar a
    // linha faria a fila parecer travada.
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
      <div className="rounded-xl border border-dashed px-6 py-8 text-center">
        <ListChecks
          className="text-muted-foreground mx-auto size-6"
          aria-hidden="true"
        />
        <p className="mt-2 text-sm font-medium">
          Nada além da montagem de hoje
        </p>
        <p className="text-muted-foreground mx-auto mt-1 max-w-sm text-sm leading-relaxed">
          Tarefas suas e etapas de outros dias aparecem aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {agora.length > 0 ? (
        <ul className="space-y-2">
          {agora.map((item, indice) => (
            <Linha
              key={item.chave}
              item={item}
              indice={indice}
              feito={concluidos.has(item.chave)}
              aoConcluir={() => concluir(item)}
            />
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground rounded-lg border border-dashed px-4 py-3 text-sm">
          Nada atrasado nem para hoje fora da montagem.
        </p>
      )}

      {proximos.length > 0 ? (
        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            aria-expanded={verProximos}
            onClick={() => setVerProximos((v) => !v)}
            className="text-muted-foreground"
          >
            <ChevronDown
              className={cn(
                "transition-transform duration-200",
                verProximos && "rotate-180",
              )}
              aria-hidden="true"
            />
            {verProximos ? "Ocultar" : "Ver"} o que vem depois
            <span className="tabular">({proximos.length})</span>
          </Button>

          {verProximos ? (
            <ul className="space-y-2">
              {proximos.map((item, indice) => (
                <Linha
                  key={item.chave}
                  item={item}
                  indice={indice}
                  feito={concluidos.has(item.chave)}
                  aoConcluir={() => concluir(item)}
                />
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
