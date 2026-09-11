/**
 * Vocabulário do Steera em TypeScript.
 *
 * Os valores string batem exatamente com os enums do Postgres
 * (supabase/migrations/20260911000001_schema.sql). Mudou aqui, muda lá.
 */

export const CARGOS = ["CHEFE", "FUNCIONARIO"] as const;
export type Cargo = (typeof CARGOS)[number];

export const FUNCOES = [
  "MESTRE_ESTEIRA",
  "GESTOR_TRAFEGO",
  "GARIMPEIRO",
  "ENGENHEIRO_FLUXOS",
] as const;
export type Funcao = (typeof FUNCOES)[number];

export const OFERTA_STATUS = [
  "NA_PENEIRA",
  "NA_ESTEIRA",
  "CONCLUIDA",
  "VALIDADA",
  "INVALIDADA",
  "DESCARTADA",
] as const;
export type OfertaStatus = (typeof OFERTA_STATUS)[number];

export const RODADA_STATUS = [
  "PLANEJADA",
  "EM_ANDAMENTO",
  "CONCLUIDA",
  "CANCELADA",
] as const;
export type RodadaStatus = (typeof RODADA_STATUS)[number];

export const TAREFA_STATUS = ["ABERTA", "CONCLUIDA", "CANCELADA"] as const;
export type TarefaStatus = (typeof TAREFA_STATUS)[number];

export type Prioridade = "NORMAL" | "ALTA";
export type ResponsavelOrigem = "SUGERIDO" | "DELEGADO";
export type AnexoTipo = "CRIATIVO" | "REFERENCIA";

/* ────────────────────────────────────────────────────────────────────────────
   Rótulos legíveis
   ──────────────────────────────────────────────────────────────────────────── */

export const CARGO_LABEL: Record<Cargo, string> = {
  CHEFE: "Chefe",
  FUNCIONARIO: "Funcionário",
};

export const FUNCAO_LABEL: Record<Funcao, string> = {
  MESTRE_ESTEIRA: "Mestre da Esteira",
  GESTOR_TRAFEGO: "Gestor de Tráfego",
  GARIMPEIRO: "Garimpeiro",
  ENGENHEIRO_FLUXOS: "Engenheiro de Fluxos",
};

export const FUNCAO_DESCRICAO: Record<Funcao, string> = {
  MESTRE_ESTEIRA: "Monta as rodadas, distribui as ofertas e delega as etapas.",
  GESTOR_TRAFEGO: "Cuida das páginas, das campanhas e do tráfego.",
  GARIMPEIRO: "Produz os criativos e os entregáveis.",
  ENGENHEIRO_FLUXOS: "Monta e alinha os fluxos do ChatBot.",
};

/**
 * Metadados de exibição de cada status.
 *
 * `icone` é o nome do componente Lucide e `token` é a variável CSS de cor.
 * A cor nunca aparece sozinha: o rótulo e o ícone vão junto, sempre
 * (regra `color-not-only`, docs/DESIGN.md §2.2).
 */
export type StatusVisual = {
  label: string;
  icone: string;
  token: string;
};

export const OFERTA_STATUS_VISUAL: Record<OfertaStatus, StatusVisual> = {
  NA_PENEIRA: {
    label: "Na Peneira",
    icone: "Filter",
    token: "var(--status-peneira)",
  },
  NA_ESTEIRA: {
    label: "Na Esteira",
    icone: "Cog",
    token: "var(--status-esteira)",
  },
  CONCLUIDA: {
    label: "Concluída",
    icone: "CheckCheck",
    token: "var(--status-concluida)",
  },
  VALIDADA: {
    label: "Validada",
    icone: "BadgeCheck",
    token: "var(--status-validada)",
  },
  INVALIDADA: {
    label: "Invalidada",
    icone: "XCircle",
    token: "var(--status-invalidada)",
  },
  DESCARTADA: {
    label: "Descartada",
    icone: "Archive",
    token: "var(--status-descartada)",
  },
};

export const RODADA_STATUS_LABEL: Record<RodadaStatus, string> = {
  PLANEJADA: "Planejada",
  EM_ANDAMENTO: "Em andamento",
  CONCLUIDA: "Concluída",
  CANCELADA: "Cancelada",
};

export const TAREFA_STATUS_LABEL: Record<TarefaStatus, string> = {
  ABERTA: "Aberta",
  CONCLUIDA: "Concluída",
  CANCELADA: "Cancelada",
};

export const PRIORIDADE_LABEL: Record<Prioridade, string> = {
  NORMAL: "Normal",
  ALTA: "Alta",
};

/* ────────────────────────────────────────────────────────────────────────────
   Transições permitidas (docs/PLANEJAMENTO.md §4)
   ──────────────────────────────────────────────────────────────────────────── */

export const TRANSICOES_OFERTA: Record<OfertaStatus, readonly OfertaStatus[]> = {
  NA_PENEIRA: ["NA_ESTEIRA", "DESCARTADA"],
  NA_ESTEIRA: ["CONCLUIDA", "NA_PENEIRA"],
  CONCLUIDA: ["VALIDADA", "INVALIDADA", "NA_ESTEIRA"],
  VALIDADA: ["CONCLUIDA"],
  INVALIDADA: ["CONCLUIDA"],
  DESCARTADA: ["NA_PENEIRA"],
};

export function podeTransicionar(de: OfertaStatus, para: OfertaStatus): boolean {
  return TRANSICOES_OFERTA[de].includes(para);
}

/** Status em que a oferta ainda está em trabalho ativo. */
export function estaAtiva(status: OfertaStatus): boolean {
  return status === "NA_PENEIRA" || status === "NA_ESTEIRA";
}

/**
 * "Atrasada" nunca é gravado no banco (RN-14): é sempre derivado da data
 * prevista contra o estado atual.
 */
export function estaAtrasada(
  status: OfertaStatus,
  dataPrevista: string | null,
  hoje: Date,
): boolean {
  if (status !== "NA_ESTEIRA" || !dataPrevista) return false;
  return new Date(`${dataPrevista}T23:59:59`) < hoje;
}
