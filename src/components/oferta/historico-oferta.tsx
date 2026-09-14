import {
  Archive,
  BadgeCheck,
  CalendarClock,
  CheckCheck,
  Cog,
  Lightbulb,
  UserMinus,
  UserPlus,
  XCircle,
  type LucideIcon,
} from "lucide-react";

import { formatarData } from "@/lib/data";

/**
 * RF-08.3 — linha do tempo da oferta.
 *
 * Os eventos são gravados por trigger (RN-16), não pela aplicação: o histórico
 * registra o que o banco realmente fez, não o que a interface achou que fez.
 */

const ROTULOS: Record<string, { texto: string; icone: LucideIcon }> = {
  CRIADA: { texto: "Cadastrada na Peneira", icone: Lightbulb },
  ESCALADA: { texto: "Escalada para uma Rodada", icone: Cog },
  REMANEJADA: { texto: "Remanejada no calendário", icone: CalendarClock },
  ETAPA_DELEGADA: { texto: "Etapa delegada", icone: UserPlus },
  ETAPA_LIBERADA: { texto: "Responsável removido de uma etapa", icone: UserMinus },
  CONCLUIDA: { texto: "Montagem concluída", icone: CheckCheck },
  VALIDADA: { texto: "Validada no teste", icone: BadgeCheck },
  INVALIDADA: { texto: "Invalidada no teste", icone: XCircle },
  DESCARTADA: { texto: "Descartada", icone: Archive },
  DEVOLVIDA_PENEIRA: { texto: "Devolvida para a Peneira", icone: Archive },
};

export type EventoDaOferta = {
  id: string;
  tipo: string;
  ocorridoEm: string;
  detalhe: Record<string, unknown>;
  autor: string | null;
};

function descreverDetalhe(evento: EventoDaOferta): string | null {
  if (evento.tipo === "REMANEJADA") {
    const de = evento.detalhe.de;
    const para = evento.detalhe.para;
    if (typeof de === "string" && typeof para === "string") {
      return `${formatarData(de)} → ${formatarData(para)}`;
    }
  }
  return null;
}

export function HistoricoOferta({ eventos }: { eventos: EventoDaOferta[] }) {
  if (eventos.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Nenhum evento registrado ainda.
      </p>
    );
  }

  return (
    <ol className="space-y-0">
      {eventos.map((evento, indice) => {
        const rotulo = ROTULOS[evento.tipo] ?? {
          texto: evento.tipo,
          icone: Cog,
        };
        const Icone = rotulo.icone;
        const detalhe = descreverDetalhe(evento);
        const ultimo = indice === eventos.length - 1;

        return (
          <li key={evento.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span className="bg-muted text-muted-foreground flex size-7 shrink-0 items-center justify-center rounded-full">
                <Icone className="size-3.5" aria-hidden="true" />
              </span>
              {ultimo ? null : <span className="bg-border w-px flex-1" />}
            </div>

            <div className="pb-4">
              <p className="text-sm">{rotulo.texto}</p>
              <p className="text-muted-foreground text-xs">
                <time dateTime={evento.ocorridoEm} className="tabular">
                  {new Date(evento.ocorridoEm).toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: "America/Sao_Paulo",
                  })}
                </time>
                {evento.autor ? ` · ${evento.autor}` : ""}
                {detalhe ? ` · ${detalhe}` : ""}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
