import { TrendingDown } from "lucide-react";

import { formatarPercentual, maiorQueda, type EstagioDoFunil } from "@/lib/painel";
import { cn } from "@/lib/utils";

const CORES = [
  "var(--funil-1)",
  "var(--funil-2)",
  "var(--funil-3)",
  "var(--funil-4)",
];

/**
 * Funil do período (RF-09.4).
 *
 * Barras horizontais em HTML, não uma biblioteca de funil: quatro números
 * ordenados não precisam de SVG, e a versão em HTML já é navegável por teclado
 * e lida por leitor de tela sem nenhum trabalho extra.
 *
 * A cor é uma rampa de um hue só, escurecendo. São quatro marcos do mesmo
 * caminho — quatro cores diferentes sugeririam identidades independentes.
 */
export function FunilPeriodo({ estagios }: { estagios: EstagioDoFunil[] }) {
  const base = estagios[0]?.quantidade ?? 0;
  const pior = maiorQueda(estagios);

  if (base === 0) {
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Funil do período</h3>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Nenhuma oferta foi cadastrada neste período, então não há caminho para
          medir. Amplie o intervalo ou cadastre ideias na Peneira.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-medium">Funil do período</h3>
        <p className="text-muted-foreground text-xs">
          Da ideia cadastrada até a oferta validada.
        </p>
      </div>

      <ol className="space-y-2.5">
        {estagios.map((estagio, i) => {
          const largura = base > 0 ? (estagio.quantidade / base) * 100 : 0;
          const ehPior = i === pior;

          return (
            <li key={estagio.rotulo} className="space-y-1">
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span>{estagio.rotulo}</span>
                <span className="flex items-center gap-2">
                  {estagio.conversao !== null ? (
                    <span
                      className={cn(
                        "text-xs tabular",
                        ehPior
                          ? "text-[color:var(--status-atrasada)] font-medium"
                          : "text-muted-foreground",
                      )}
                    >
                      {ehPior ? (
                        <TrendingDown
                          className="mr-0.5 inline size-3"
                          aria-hidden="true"
                        />
                      ) : null}
                      {formatarPercentual(estagio.conversao)}
                      <span className="sr-only">
                        {" "}
                        do estágio anterior
                        {ehPior ? ". Maior queda do funil." : ""}
                      </span>
                    </span>
                  ) : null}
                  <span className="font-mono font-medium tabular">
                    {estagio.quantidade}
                  </span>
                </span>
              </div>

              {/* Trilho + preenchimento. A barra é fina e o número fica fora
                  dela, que é o que mantém o valor legível quando a barra é
                  curta demais para caber texto dentro. */}
              <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max(largura, estagio.quantidade > 0 ? 2 : 0)}%`,
                    background: CORES[i],
                  }}
                />
              </div>
            </li>
          );
        })}
      </ol>

      {pior !== null && estagios[pior].conversao !== null ? (
        <p className="text-muted-foreground text-xs leading-relaxed">
          A maior perda está entre{" "}
          <strong>{estagios[pior - 1].rotulo.toLowerCase()}</strong> e{" "}
          <strong>{estagios[pior].rotulo.toLowerCase()}</strong>:{" "}
          {formatarPercentual(estagios[pior].conversao)} seguem adiante.
        </p>
      ) : null}
    </div>
  );
}
