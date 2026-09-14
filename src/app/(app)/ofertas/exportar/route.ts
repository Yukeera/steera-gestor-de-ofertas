import { NextResponse, type NextRequest } from "next/server";

import { obterMembroAtual } from "@/lib/auth/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { hojeISO } from "@/lib/data";
import {
  OFERTA_STATUS,
  OFERTA_STATUS_VISUAL,
  type OfertaStatus,
} from "@/lib/dominio/tipos";

/**
 * RF-08.5 — exporta a listagem filtrada em CSV.
 *
 * Usa os mesmos parâmetros de `/ofertas`, então o arquivo bate exatamente com
 * o que está na tela. Repetir os filtros aqui é a única duplicação aceitável:
 * um export que ignora o filtro visível é pior do que não ter export.
 */

const COLUNAS = [
  "Nome",
  "Status",
  "Nicho",
  "Rodada",
  "Cadastrada por",
  "Cadastrada em",
  "Dia na esteira",
  "Montada em",
  "Validada em",
  "Etapas concluidas",
  "Etapas totais",
  "Observacao da validacao",
] as const;

/**
 * Escapa um campo para CSV.
 *
 * O BOM e o separador ponto-e-vírgula vêm depois: o Excel em português abre
 * CSV separado por vírgula tudo numa coluna só.
 */
function campo(valor: unknown): string {
  if (valor === null || valor === undefined) return "";
  const texto = String(valor);
  return /[";\n]/.test(texto) ? `"${texto.replaceAll('"', '""')}"` : texto;
}

type Linha = {
  nome: string;
  status: OfertaStatus;
  nicho: string | null;
  criada_em: string;
  data_prevista: string | null;
  data_conclusao: string | null;
  data_validacao: string | null;
  observacao_validacao: string | null;
  rodadas: { nome: string } | null;
  membros: { nome: string } | null;
  oferta_etapas: { concluida: boolean }[];
};

export async function GET(request: NextRequest) {
  const membro = await obterMembroAtual();
  if (!membro?.ativo) {
    return new NextResponse("Não autorizado", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const supabase = await criarClienteServidor();

  const status = searchParams.get("status");
  const campoData = searchParams.get("campo") ?? "criada_em";
  const de = searchParams.get("de");
  const ate = searchParams.get("ate");

  let consulta = supabase
    .from("ofertas")
    .select(
      "nome, status, nicho, criada_em, data_prevista, data_conclusao, data_validacao, observacao_validacao, rodadas(nome), membros!ofertas_criada_por_fkey(nome), oferta_etapas(concluida)",
    )
    .order("criada_em", { ascending: false });

  if (status && OFERTA_STATUS.includes(status as OfertaStatus)) {
    consulta = consulta.eq("status", status);
  }

  const rodada = searchParams.get("rodada");
  if (rodada) consulta = consulta.eq("rodada_id", rodada);

  const autor = searchParams.get("autor");
  if (autor) consulta = consulta.eq("criada_por", autor);

  if (de) consulta = consulta.gte(campoData, de);
  if (ate) consulta = consulta.lte(campoData, `${ate}T23:59:59`);

  const { data, error } = await consulta;

  if (error) {
    return new NextResponse(`Falha ao exportar: ${error.message}`, {
      status: 500,
    });
  }

  const linhas = (data ?? []) as unknown as Linha[];

  const corpo = linhas.map((l) =>
    [
      l.nome,
      OFERTA_STATUS_VISUAL[l.status].label,
      l.nicho,
      l.rodadas?.nome,
      l.membros?.nome,
      l.criada_em?.slice(0, 10),
      l.data_prevista,
      l.data_conclusao?.slice(0, 10),
      l.data_validacao,
      l.oferta_etapas.filter((e) => e.concluida).length,
      l.oferta_etapas.length,
      l.observacao_validacao,
    ]
      .map(campo)
      .join(";"),
  );

  // ﻿ é o BOM: sem ele o Excel abre o arquivo em ANSI e come os acentos.
  const csv = `﻿${COLUNAS.join(";")}\n${corpo.join("\n")}\n`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="steera-ofertas-${hojeISO()}.csv"`,
    },
  });
}
