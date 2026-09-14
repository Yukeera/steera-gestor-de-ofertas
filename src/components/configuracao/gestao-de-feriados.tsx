"use client";

import { useRef, useState, useTransition } from "react";
import { CalendarOff, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { adicionarFeriado, removerFeriado } from "@/actions/feriados";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatarDataPorExtenso } from "@/lib/data";

export type Feriado = { data: string; descricao: string };

export function GestaoDeFeriados({
  feriados,
  podeEditar,
}: {
  feriados: Feriado[];
  podeEditar: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, iniciar] = useTransition();

  // Agrupa por ano: a lista cresce todo ano e uma coluna única viraria rolagem
  // sem referência de onde a pessoa está.
  const porAno = new Map<string, Feriado[]>();
  for (const feriado of feriados) {
    const ano = feriado.data.slice(0, 4);
    porAno.set(ano, [...(porAno.get(ano) ?? []), feriado]);
  }

  function adicionar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);

    const dados = new FormData(evento.currentTarget);

    iniciar(async () => {
      const resultado = await adicionarFeriado(dados);
      if (resultado.ok) {
        toast.success("Feriado cadastrado. A esteira já pula esse dia.");
        formRef.current?.reset();
      } else {
        setErro(resultado.erro);
      }
    });
  }

  function remover(feriado: Feriado) {
    iniciar(async () => {
      const resultado = await removerFeriado(feriado.data);
      if (resultado.ok) toast.success(`"${feriado.descricao}" removido.`);
      else toast.error(resultado.erro);
    });
  }

  return (
    <div className="max-w-2xl space-y-6">
      {podeEditar ? (
        <form
          ref={formRef}
          onSubmit={adicionar}
          className="bg-card flex flex-wrap items-end gap-3 rounded-xl border p-4"
          noValidate
        >
          <div className="space-y-1.5">
            <Label htmlFor="data">Data</Label>
            <Input id="data" name="data" type="date" className="w-44" required />
          </div>

          <div className="min-w-48 flex-1 space-y-1.5">
            <Label htmlFor="descricao">Qual feriado</Label>
            <Input
              id="descricao"
              name="descricao"
              placeholder="Ex.: Aniversário da cidade"
              required
            />
          </div>

          <Button type="submit" disabled={salvando}>
            {salvando ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <Plus aria-hidden="true" />
            )}
            Adicionar
          </Button>

          {erro ? (
            <p role="alert" className="text-destructive w-full text-sm">
              {erro}
            </p>
          ) : null}
        </form>
      ) : null}

      {feriados.length === 0 ? (
        <div className="rounded-xl border border-dashed px-6 py-12 text-center">
          <CalendarOff
            className="text-muted-foreground mx-auto size-7"
            aria-hidden="true"
          />
          <p className="mt-2 font-medium">Nenhum feriado cadastrado</p>
          <p className="text-muted-foreground mx-auto mt-1 max-w-md text-sm leading-relaxed">
            Sem feriados na lista, a esteira só pula sábados e domingos.
          </p>
        </div>
      ) : (
        [...porAno.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([ano, doAno]) => (
            <section key={ano} className="space-y-2">
              <h3 className="text-muted-foreground font-mono text-xs tabular">
                {ano}
              </h3>
              <ul className="divide-y rounded-xl border">
                {doAno.map((feriado) => (
                  <li
                    key={feriado.data}
                    className="flex items-center gap-3 px-4 py-2.5"
                  >
                    <time
                      dateTime={feriado.data}
                      className="text-muted-foreground w-40 shrink-0 text-sm tabular"
                    >
                      {formatarDataPorExtenso(feriado.data)}
                    </time>
                    <span className="min-w-0 flex-1 text-sm">
                      {feriado.descricao}
                    </span>
                    {podeEditar ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive size-8"
                        disabled={salvando}
                        onClick={() => remover(feriado)}
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                        <span className="sr-only">
                          Remover {feriado.descricao}
                        </span>
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ))
      )}
    </div>
  );
}
