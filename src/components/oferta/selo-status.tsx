import {
  Archive,
  BadgeCheck,
  CheckCheck,
  Cog,
  Filter,
  XCircle,
  type LucideIcon,
} from "lucide-react";

import { OFERTA_STATUS_VISUAL, type OfertaStatus } from "@/lib/dominio/tipos";
import { cn } from "@/lib/utils";

const ICONES: Record<OfertaStatus, LucideIcon> = {
  NA_PENEIRA: Filter,
  NA_ESTEIRA: Cog,
  CONCLUIDA: CheckCheck,
  VALIDADA: BadgeCheck,
  INVALIDADA: XCircle,
  DESCARTADA: Archive,
};

/**
 * Selo de status da oferta.
 *
 * Ícone e rótulo sempre juntos: a cor é reforço, nunca o único portador do
 * significado (regra `color-not-only`, docs/DESIGN.md §2.2). Quem não
 * distingue as cores continua lendo o estado sem esforço.
 */
export function SeloStatus({
  status,
  className,
}: {
  status: OfertaStatus;
  className?: string;
}) {
  const visual = OFERTA_STATUS_VISUAL[status];
  const Icone = ICONES[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium",
        className,
      )}
      style={{
        color: visual.token,
        borderColor: `color-mix(in oklab, ${visual.token} 35%, transparent)`,
        backgroundColor: `color-mix(in oklab, ${visual.token} 10%, transparent)`,
      }}
    >
      <Icone className="size-3.5" aria-hidden="true" />
      {visual.label}
    </span>
  );
}
