import { differenceInCalendarDays, format, parseISO, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";

import { paraISO } from "@/lib/agenda";
import type { OfertaStatus } from "@/lib/dominio/tipos";

export type OfertaParaMetrica = {
  id: string;
  nome: string;
  status: OfertaStatus;
  criadaEm: string;
  escaladaEm: string | null;
  dataConclusao: string | null;
  dataValidacao: string | null;
  capaUrl: string | null;
};

export type PontoSemanal = {
  /** Início da semana, `yyyy-MM-dd`. Serve de chave. */
  semana: string;
  rotulo: string;
  quantidade: number;
};

export type EstagioDoFunil = {
  rotulo: string;
  quantidade: number;
  /** Conversão a partir do estágio anterior. `null` no primeiro. */
  conversao: number | null;
};

/** `2026-09-14` está dentro de [de, ate]? Compara como string ISO, que ordena. */
function dentro(data: string | null, de: string, ate: string): boolean {
  if (!data) return false;
  const dia = data.slice(0, 10);
  return dia >= de && dia <= ate;
}

/**
 * Indicadores do período (RF-09.1).
 *
 * Cada um responde a uma pergunta diferente sobre o mesmo conjunto, então
 * todos saem de uma varredura só — não de cinco consultas ao banco.
 */
export function calcularIndicadores(
  ofertas: OfertaParaMetrica[],
  de: string,
  ate: string,
) {
  let concluidasNoPeriodo = 0;
  let validadasNoPeriodo = 0;
  let invalidadasNoPeriodo = 0;
  let naEsteiraAgora = 0;
  let somaDeDias = 0;
  let comTempoMedido = 0;

  for (const oferta of ofertas) {
    // "Na esteira agora" ignora o filtro de período de propósito: é uma foto
    // do presente, não uma contagem histórica.
    if (oferta.status === "NA_ESTEIRA") naEsteiraAgora += 1;

    if (dentro(oferta.dataConclusao, de, ate)) {
      concluidasNoPeriodo += 1;

      if (oferta.criadaEm && oferta.dataConclusao) {
        somaDeDias += differenceInCalendarDays(
          parseISO(oferta.dataConclusao),
          parseISO(oferta.criadaEm),
        );
        comTempoMedido += 1;
      }
    }

    if (dentro(oferta.dataValidacao, de, ate)) {
      if (oferta.status === "VALIDADA") validadasNoPeriodo += 1;
      if (oferta.status === "INVALIDADA") invalidadasNoPeriodo += 1;
    }
  }

  const julgadas = validadasNoPeriodo + invalidadasNoPeriodo;

  return {
    concluidasNoPeriodo,
    validadasNoPeriodo,
    invalidadasNoPeriodo,
    naEsteiraAgora,
    /** `null` quando nada foi julgado: 0% diria que tudo falhou. */
    taxaDeValidacao: julgadas > 0 ? validadasNoPeriodo / julgadas : null,
    /** `null` quando nada fechou no período — média de zero itens não existe. */
    tempoMedioEmDias:
      comTempoMedido > 0 ? Math.round(somaDeDias / comTempoMedido) : null,
  };
}

/**
 * Ofertas concluídas por semana (RF-09.3).
 *
 * Preenche as semanas vazias: sem isso, uma semana sem conclusão some do eixo
 * e o gráfico sugere continuidade onde houve parada.
 */
export function agruparPorSemana(
  ofertas: OfertaParaMetrica[],
  de: string,
  ate: string,
): PontoSemanal[] {
  const contagem = new Map<string, number>();

  let cursor = startOfWeek(parseISO(de), { weekStartsOn: 0 });
  const fim = parseISO(ate);

  while (cursor <= fim) {
    contagem.set(paraISO(cursor), 0);
    cursor = new Date(cursor.getTime() + 7 * 86_400_000);
  }

  for (const oferta of ofertas) {
    if (!dentro(oferta.dataConclusao, de, ate)) continue;

    const semana = paraISO(
      startOfWeek(parseISO(oferta.dataConclusao!.slice(0, 10)), {
        weekStartsOn: 0,
      }),
    );

    if (contagem.has(semana)) {
      contagem.set(semana, (contagem.get(semana) ?? 0) + 1);
    }
  }

  return [...contagem.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([semana, quantidade]) => ({
      semana,
      rotulo: format(parseISO(semana), "dd/MM", { locale: ptBR }),
      quantidade,
    }));
}

/**
 * Funil do período (RF-09.4).
 *
 * São quatro marcos do MESMO caminho, não quatro categorias independentes —
 * por isso a interface pinta com uma rampa de um hue só.
 */
export function montarFunil(
  ofertas: OfertaParaMetrica[],
  de: string,
  ate: string,
): EstagioDoFunil[] {
  const cadastradas = ofertas.filter((o) => dentro(o.criadaEm, de, ate)).length;
  const escaladas = ofertas.filter((o) => dentro(o.escaladaEm, de, ate)).length;
  const concluidas = ofertas.filter((o) =>
    dentro(o.dataConclusao, de, ate),
  ).length;
  const validadas = ofertas.filter(
    (o) => o.status === "VALIDADA" && dentro(o.dataValidacao, de, ate),
  ).length;

  const numeros = [cadastradas, escaladas, concluidas, validadas];
  const rotulos = ["Cadastradas", "Escaladas", "Concluídas", "Validadas"];

  return numeros.map((quantidade, i) => ({
    rotulo: rotulos[i],
    quantidade,
    conversao:
      i === 0 ? null : numeros[i - 1] > 0 ? quantidade / numeros[i - 1] : null,
  }));
}

/** Índice do estágio com a maior queda — o que o funil existe para mostrar. */
export function maiorQueda(estagios: EstagioDoFunil[]): number | null {
  let pior: number | null = null;
  let menor = Infinity;

  for (let i = 1; i < estagios.length; i += 1) {
    const conversao = estagios[i].conversao;
    if (conversao !== null && conversao < menor) {
      menor = conversao;
      pior = i;
    }
  }

  return pior;
}

export function formatarPercentual(valor: number | null): string {
  if (valor === null) return "—";
  return `${Math.round(valor * 100)}%`;
}
