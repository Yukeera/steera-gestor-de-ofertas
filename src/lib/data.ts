import { format, formatDistanceToNowStrict, isSameDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";

/**
 * O Steera opera numa única praça. Fixar o fuso evita o clássico "a oferta de
 * hoje sumiu às 21h" — que é o que acontece quando o servidor roda em UTC e
 * `new Date()` vira o dia antes de virar em São Paulo.
 */
export const FUSO = "America/Sao_Paulo";

/** Data de hoje em São Paulo, no formato `yyyy-MM-dd` usado nas colunas `date`. */
export function hojeISO(): string {
  return formatInTimeZone(new Date(), FUSO, "yyyy-MM-dd");
}

/** "agora" já convertido para o fuso da equipe. */
export function agoraNoFuso(): Date {
  return toZonedTime(new Date(), FUSO);
}

/** `2026-09-11` → `11/09/2026` */
export function formatarData(data: string | Date): string {
  const d = typeof data === "string" ? parseISO(data) : data;
  return format(d, "dd/MM/yyyy", { locale: ptBR });
}

/** `2026-09-11` → `Sexta, 11/09` */
export function formatarDataPorExtenso(data: string | Date): string {
  const d = typeof data === "string" ? parseISO(data) : data;
  const texto = format(d, "EEEE, dd/MM", { locale: ptBR });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/**
 * Rótulo relativo para listas de tarefas: "hoje" e "amanhã" comunicam muito
 * mais rápido que uma data, e o resto cai para a data mesmo.
 */
export function rotuloDePrazo(data: string): string {
  const alvo = parseISO(data);
  const hoje = parseISO(hojeISO());

  if (isSameDay(alvo, hoje)) return "hoje";

  const umDia = 86_400_000;
  const diferenca = Math.round((alvo.getTime() - hoje.getTime()) / umDia);

  if (diferenca === 1) return "amanhã";
  if (diferenca === -1) return "ontem";
  if (diferenca < 0) {
    return `atrasada há ${formatDistanceToNowStrict(alvo, { locale: ptBR })}`;
  }
  return formatarData(alvo);
}
