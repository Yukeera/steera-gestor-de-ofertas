import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";

import { paraISO } from "@/lib/agenda";

export type Periodo = "mes" | "semana";

export type DiaDoCalendario = {
  iso: string;
  numero: number;
  noPeriodo: boolean;
  ehHoje: boolean;
  ehFimDeSemana: boolean;
  ehFeriado: boolean;
};

/** `2026-09` → intervalo que a consulta precisa cobrir, já com as bordas. */
export function intervaloVisivel(
  referencia: string,
  periodo: Periodo,
): { inicio: string; fim: string } {
  const base = parseISO(`${referencia}-01`);

  if (periodo === "semana") {
    const inicio = startOfWeek(parseISO(referencia), { weekStartsOn: 0 });
    return { inicio: paraISO(inicio), fim: paraISO(addDays(inicio, 6)) };
  }

  // A grade do mês mostra dias do mês anterior e do seguinte para fechar as
  // semanas; a consulta precisa trazê-los, senão o card some na virada.
  const inicio = startOfWeek(startOfMonth(base), { weekStartsOn: 0 });
  const fim = endOfWeek(endOfMonth(base), { weekStartsOn: 0 });
  return { inicio: paraISO(inicio), fim: paraISO(fim) };
}

export function montarGrade(
  referencia: string,
  periodo: Periodo,
  feriados: Set<string>,
): DiaDoCalendario[] {
  const { inicio, fim } = intervaloVisivel(referencia, periodo);
  const base =
    periodo === "semana" ? parseISO(referencia) : parseISO(`${referencia}-01`);

  return eachDayOfInterval({
    start: parseISO(inicio),
    end: parseISO(fim),
  }).map((data) => {
    const iso = paraISO(data);
    const diaDaSemana = data.getDay();

    return {
      iso,
      numero: data.getDate(),
      noPeriodo: periodo === "semana" ? true : isSameMonth(data, base),
      ehHoje: isToday(data),
      ehFimDeSemana: diaDaSemana === 0 || diaDaSemana === 6,
      ehFeriado: feriados.has(iso),
    };
  });
}

export const NOMES_DOS_DIAS = [
  "dom",
  "seg",
  "ter",
  "qua",
  "qui",
  "sex",
  "sáb",
] as const;

/** `2026-09` → `Setembro de 2026` */
export function tituloDoPeriodo(referencia: string, periodo: Periodo): string {
  if (periodo === "semana") {
    const inicio = startOfWeek(parseISO(referencia), { weekStartsOn: 0 });
    const fim = addDays(inicio, 6);
    return `${format(inicio, "dd/MM", { locale: ptBR })} a ${format(fim, "dd/MM/yyyy", { locale: ptBR })}`;
  }

  const texto = format(parseISO(`${referencia}-01`), "MMMM 'de' yyyy", {
    locale: ptBR,
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** Navegação: devolve a referência do período anterior ou seguinte. */
export function deslocar(
  referencia: string,
  periodo: Periodo,
  passos: number,
): string {
  if (periodo === "semana") {
    return paraISO(addDays(parseISO(referencia), passos * 7));
  }

  const base = parseISO(`${referencia}-01`);
  const destino = new Date(base.getFullYear(), base.getMonth() + passos, 1);
  return format(destino, "yyyy-MM");
}
