import type { OfertaStatus, Prioridade } from "@/lib/dominio/tipos";

export type ResponsavelLeve = {
  id: string;
  nome: string;
  fotoUrl: string | null;
};

export type OfertaNoCalendario = {
  id: string;
  nome: string;
  descricao: string;
  status: OfertaStatus;
  dataPrevista: string;
  capaUrl: string | null;
  rodada: { id: string; nome: string } | null;
  totalEtapas: number;
  etapasConcluidas: number;
  responsaveis: ResponsavelLeve[];
  /** Derivado no servidor para a grade não recalcular por card. */
  atrasada: boolean;
  /** Se a pessoa logada é responsável por alguma etapa desta oferta. */
  minha: boolean;
};

export type TarefaNoCalendario = {
  id: string;
  titulo: string;
  prazo: string;
  prioridade: Prioridade;
  responsaveis: ResponsavelLeve[];
  minha: boolean;
};
