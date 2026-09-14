import Link from "next/link";
import { AlertTriangle, ImageOff, type LucideIcon } from "lucide-react";

import { AvatarMembro } from "@/components/equipe/avatar-membro";
import { Card, CardContent } from "@/components/ui/card";
import { formatarData } from "@/lib/data";
import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────────────────────
   Indicador — o número é o gráfico
   ──────────────────────────────────────────────────────────────────────────── */

export function CartaoIndicador({
  rotulo,
  valor,
  detalhe,
  icone: Icone,
  destaque,
}: {
  rotulo: string;
  valor: string;
  detalhe?: string;
  icone?: LucideIcon;
  destaque?: boolean;
}) {
  return (
    <Card>
      <CardContent className="space-y-1">
        <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
          {Icone ? <Icone className="size-3.5" aria-hidden="true" /> : null}
          {rotulo}
        </p>
        {/* Número em mono tabular: o valor não dança quando o período muda. */}
        <p
          className={cn(
            "font-mono text-3xl leading-none font-medium tabular",
            destaque && "text-[color:var(--status-validada)]",
          )}
        >
          {valor}
        </p>
        {detalhe ? (
          <p className="text-muted-foreground text-xs leading-relaxed">
            {detalhe}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Galeria de Validadas (RF-09.2)
   ──────────────────────────────────────────────────────────────────────────── */

export type OfertaValidada = {
  id: string;
  nome: string;
  capaUrl: string | null;
  dataValidacao: string | null;
};

export function GaleriaValidadas({ ofertas }: { ofertas: OfertaValidada[] }) {
  if (ofertas.length === 0) {
    return (
      <p className="text-muted-foreground text-sm leading-relaxed">
        Nenhuma oferta foi validada neste período. Quando o teste de mercado
        aprovar uma, ela aparece aqui com a imagem e o nome.
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {ofertas.map((oferta) => (
        <li key={oferta.id}>
          <Link
            href={`/ofertas/${oferta.id}`}
            className="focus-visible:ring-ring group block rounded-lg focus-visible:ring-2 focus-visible:outline-none"
          >
            <div className="bg-muted relative aspect-video overflow-hidden rounded-lg border">
              {oferta.capaUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- URL assinada e efêmera do Storage privado
                <img
                  src={oferta.capaUrl}
                  alt={`Capa da oferta ${oferta.nome}`}
                  loading="lazy"
                  className="absolute inset-0 size-full object-cover transition-transform group-hover:scale-105"
                />
              ) : (
                <ImageOff
                  className="text-muted-foreground absolute inset-0 m-auto size-5"
                  aria-hidden="true"
                />
              )}
            </div>
            <p className="mt-1.5 truncate text-sm font-medium group-hover:underline">
              {oferta.nome}
            </p>
            {oferta.dataValidacao ? (
              <p className="text-muted-foreground text-xs tabular">
                {formatarData(oferta.dataValidacao)}
              </p>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Alertas (RF-09.6)
   ──────────────────────────────────────────────────────────────────────────── */

export type Alerta = {
  chave: string;
  texto: string;
  href: string;
};

export function Alertas({ alertas }: { alertas: Alerta[] }) {
  if (alertas.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Nada pedindo atenção agora.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {alertas.map((alerta) => (
        <li key={alerta.chave}>
          <Link
            href={alerta.href}
            className="hover:bg-accent/50 flex items-start gap-2 rounded-md border p-3 text-sm transition-colors"
          >
            {/* Ícone junto da cor: o alerta precisa ser legível para quem não
                distingue o laranja. */}
            <AlertTriangle
              className="mt-0.5 size-4 shrink-0 text-[color:var(--status-atrasada)]"
              aria-hidden="true"
            />
            <span className="leading-relaxed">{alerta.texto}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Produtividade por membro (RF-09.5)
   ──────────────────────────────────────────────────────────────────────────── */

export type LinhaDeProdutividade = {
  id: string;
  nome: string;
  fotoUrl: string | null;
  etapas: number;
  tarefas: number;
};

export function Produtividade({ linhas }: { linhas: LinhaDeProdutividade[] }) {
  const maximo = Math.max(...linhas.map((l) => l.etapas + l.tarefas), 1);

  if (linhas.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Nenhuma entrega registrada no período.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-xs leading-relaxed">
        Volume de trabalho entregue no período — etapas de oferta mais tarefas.
        Não é ranking: funções diferentes têm etapas de peso diferente.
      </p>

      <ul className="space-y-2.5">
        {linhas.map((linha) => {
          const total = linha.etapas + linha.tarefas;
          return (
            <li key={linha.id} className="space-y-1">
              <div className="flex items-center gap-2 text-sm">
                <AvatarMembro
                  nome={linha.nome}
                  fotoUrl={linha.fotoUrl}
                  tamanho="xs"
                />
                <span className="min-w-0 flex-1 truncate">{linha.nome}</span>
                <span className="text-muted-foreground font-mono text-xs tabular">
                  {linha.etapas} etapa{linha.etapas === 1 ? "" : "s"}
                  {linha.tarefas > 0
                    ? ` · ${linha.tarefas} tarefa${linha.tarefas === 1 ? "" : "s"}`
                    : ""}
                </span>
              </div>
              {/* Comparação de magnitude: um hue só, mais é mais longo. */}
              <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(total / maximo) * 100}%`,
                    background: "var(--chart-1)",
                  }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
