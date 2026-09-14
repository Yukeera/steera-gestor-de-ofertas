import Link from "next/link";
import { ExternalLink, ImageOff } from "lucide-react";

import { SeloStatus } from "@/components/oferta/selo-status";
import { OFERTA_STATUS_VISUAL, type OfertaStatus } from "@/lib/dominio/tipos";
import { cn } from "@/lib/utils";

export type DadosDoHeroi = {
  id: string;
  nome: string;
  descricao: string;
  anuncianteReferencia: string | null;
  urlReferencia: string | null;
  capaUrl: string | null;
  status: OfertaStatus;
  rodada: { id: string; nome: string } | null;
  totalEtapas: number;
  etapasConcluidas: number;
};

/**
 * A manchete da tela Hoje.
 *
 * O progresso é segmentado, um bloco por etapa, em vez de uma barra contínua:
 * a barra diz "62%", os blocos dizem "faltam três" — que é a informação de que
 * a pessoa precisa para decidir o que fazer agora.
 */
export function HeroiOfertaDoDia({ oferta }: { oferta: DadosDoHeroi }) {
  const visual = OFERTA_STATUS_VISUAL[oferta.status];
  const restantes = oferta.totalEtapas - oferta.etapasConcluidas;

  return (
    <section
      className="entra bg-card relative overflow-hidden rounded-xl border"
      aria-labelledby="heroi-nome"
    >
      {/* Tinta de status na borda superior e num brilho de fundo. Some antes
          de alcançar o texto, então não custa contraste de leitura. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-1"
        style={{ background: visual.token }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(120% 80% at 0% 0%, color-mix(in oklab, ${visual.token} 12%, transparent), transparent 60%)`,
        }}
      />

      <div className="relative flex flex-col gap-5 p-5 sm:flex-row sm:p-6">
        <div className="bg-muted relative aspect-video w-full shrink-0 overflow-hidden rounded-lg sm:aspect-square sm:w-40">
          {oferta.capaUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- URL assinada e efêmera do Storage privado
            <img
              src={oferta.capaUrl}
              alt={`Capa da oferta ${oferta.nome}`}
              className="absolute inset-0 size-full object-cover"
            />
          ) : (
            <ImageOff
              className="text-muted-foreground absolute inset-0 m-auto size-7"
              aria-hidden="true"
            />
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <SeloStatus status={oferta.status} />
              {oferta.rodada ? (
                <Link
                  href={`/rodadas/${oferta.rodada.id}`}
                  className="text-muted-foreground text-xs underline-offset-4 hover:underline"
                >
                  {oferta.rodada.nome}
                </Link>
              ) : null}
            </div>

            <h3
              id="heroi-nome"
              className="font-heading text-2xl leading-tight font-semibold tracking-tight text-balance"
            >
              {oferta.nome}
            </h3>

            <p className="text-muted-foreground max-w-prose text-sm leading-relaxed">
              {oferta.descricao}
            </p>
          </div>

          {oferta.totalEtapas > 0 ? (
            <div className="space-y-2">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="font-mono text-2xl leading-none font-semibold tabular">
                  {oferta.etapasConcluidas}
                  <span className="text-muted-foreground text-lg">
                    /{oferta.totalEtapas}
                  </span>
                </span>
                <span className="text-muted-foreground text-sm">
                  {restantes === 0
                    ? "roteiro fechado"
                    : `${restantes} etapa${restantes === 1 ? "" : "s"} para fechar`}
                </span>
              </div>

              {/* Um bloco por etapa. Largura mínima garante que o segmento
                  continue visível num roteiro longo. */}
              <div
                className="flex gap-1"
                role="img"
                aria-label={`${oferta.etapasConcluidas} de ${oferta.totalEtapas} etapas concluídas.`}
              >
                {Array.from({ length: oferta.totalEtapas }, (_, i) => (
                  <span
                    key={i}
                    className={cn(
                      "h-1.5 min-w-2 flex-1 rounded-full transition-colors",
                      i >= oferta.etapasConcluidas && "bg-muted",
                    )}
                    style={
                      i < oferta.etapasConcluidas
                        ? { background: visual.token }
                        : undefined
                    }
                  />
                ))}
              </div>
            </div>
          ) : null}

          <div className="text-muted-foreground flex flex-wrap items-center gap-3 text-xs">
            {oferta.anuncianteReferencia ? (
              <span>Referência: {oferta.anuncianteReferencia}</span>
            ) : null}
            {oferta.urlReferencia ? (
              <a
                href={oferta.urlReferencia}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 underline-offset-4 hover:underline"
              >
                Ver anúncio
                <ExternalLink className="size-3" aria-hidden="true" />
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
