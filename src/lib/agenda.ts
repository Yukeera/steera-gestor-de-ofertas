import { addDays, format, parseISO } from "date-fns";

/**
 * Distribuição em dias úteis — RN-02.
 *
 * Esta é a segunda implementação da mesma regra: a autoridade é a função
 * `proximo_dia_util` no Postgres, que é quem realmente grava as datas ao
 * escalar a Rodada. Esta cópia existe só para a prévia do cronograma no
 * assistente, que precisa responder a cada clique sem ida ao servidor.
 *
 * Se a regra mudar, muda nos dois lugares — e o teste de verdade é o do banco.
 */

const SABADO = 6;
const DOMINGO = 0;

function ehFimDeSemana(data: Date): boolean {
  const dia = data.getDay();
  return dia === SABADO || dia === DOMINGO;
}

/** `Date` → `yyyy-MM-dd`, que é como as colunas `date` guardam. */
export function paraISO(data: Date): string {
  return format(data, "yyyy-MM-dd");
}

/**
 * Primeiro dia útil a partir de `inicio`, inclusive.
 * `feriados` é um conjunto de datas em `yyyy-MM-dd`.
 */
export function proximoDiaUtil(inicio: Date, feriados: Set<string>): Date {
  let data = inicio;
  while (ehFimDeSemana(data) || feriados.has(paraISO(data))) {
    data = addDays(data, 1);
  }
  return data;
}

/**
 * Sequência de `quantidade` dias úteis a partir de `inicio`.
 * É o cronograma da Rodada: uma oferta por dia.
 */
export function diasUteis(
  inicio: Date,
  quantidade: number,
  feriados: Set<string>,
): Date[] {
  const datas: Date[] = [];
  let cursor = inicio;

  for (let i = 0; i < quantidade; i += 1) {
    const dia = proximoDiaUtil(cursor, feriados);
    datas.push(dia);
    cursor = addDays(dia, 1);
  }

  return datas;
}

/** Versão em string, para quem já tem a data no formato do banco. */
export function cronograma(
  inicioISO: string,
  quantidade: number,
  feriados: string[],
): string[] {
  return diasUteis(parseISO(inicioISO), quantidade, new Set(feriados)).map(
    paraISO,
  );
}
