-- Steera — schema base
-- Fase 0: enums, tabelas, índices.
-- Ver docs/PLANEJAMENTO.md §7.

-- ─────────────────────────────────────────────────────────────────────────────
-- Enums
-- ─────────────────────────────────────────────────────────────────────────────

create type cargo         as enum ('CHEFE', 'FUNCIONARIO');
create type funcao        as enum ('MESTRE_ESTEIRA', 'GESTOR_TRAFEGO', 'GARIMPEIRO', 'ENGENHEIRO_FLUXOS');
create type oferta_status as enum ('NA_PENEIRA', 'NA_ESTEIRA', 'CONCLUIDA', 'VALIDADA', 'INVALIDADA', 'DESCARTADA');
create type rodada_status as enum ('PLANEJADA', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA');
create type tarefa_status as enum ('ABERTA', 'CONCLUIDA', 'CANCELADA');
create type prioridade    as enum ('NORMAL', 'ALTA');
create type anexo_tipo    as enum ('CRIATIVO', 'REFERENCIA');
create type responsavel_origem as enum ('SUGERIDO', 'DELEGADO');

-- ─────────────────────────────────────────────────────────────────────────────
-- Equipe
-- ─────────────────────────────────────────────────────────────────────────────

create table membros (
  id         uuid primary key references auth.users (id) on delete cascade,
  nome       text not null,
  email      text not null unique,
  cargo      cargo not null default 'FUNCIONARIO',
  foto_url   text,
  ativo      boolean not null default true,
  entrou_em  date not null default current_date,
  criado_em  timestamptz not null default now()
);

comment on table membros is 'Perfil da equipe, 1:1 com auth.users. Cargo e unico por pessoa.';

-- Um membro pode acumular funcoes (RN: relacao N:N).
create table membro_funcoes (
  membro_id uuid not null references membros (id) on delete cascade,
  funcao    funcao not null,
  primary key (membro_id, funcao)
);

create index membro_funcoes_funcao_idx on membro_funcoes (funcao);

-- ─────────────────────────────────────────────────────────────────────────────
-- Roteiros de Montagem (templates de checklist)
-- ─────────────────────────────────────────────────────────────────────────────

create table roteiros (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null,
  descricao  text,
  e_padrao   boolean not null default false,
  arquivado  boolean not null default false,
  criado_por uuid references membros (id) on delete set null,
  criado_em  timestamptz not null default now()
);

-- RN-17: so um roteiro pode ser o padrao.
create unique index roteiros_padrao_unico_idx on roteiros (e_padrao) where e_padrao;

create table roteiro_etapas (
  id         uuid primary key default gen_random_uuid(),
  roteiro_id uuid not null references roteiros (id) on delete cascade,
  ordem      int not null,
  titulo     text not null,
  descricao  text,
  unique (roteiro_id, ordem) deferrable initially deferred
);

create index roteiro_etapas_roteiro_idx on roteiro_etapas (roteiro_id, ordem);

-- Uma etapa pode sugerir mais de uma funcao (ex.: etapa 7 do roteiro padrao).
create table roteiro_etapa_funcoes (
  roteiro_etapa_id uuid not null references roteiro_etapas (id) on delete cascade,
  funcao           funcao not null,
  primary key (roteiro_etapa_id, funcao)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Rodadas
-- ─────────────────────────────────────────────────────────────────────────────

create table rodadas (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  data_inicio date not null,
  observacoes text,
  status      rodada_status not null default 'PLANEJADA',
  criada_por  uuid references membros (id) on delete set null,
  criada_em   timestamptz not null default now()
);

create index rodadas_status_idx on rodadas (status);

-- ─────────────────────────────────────────────────────────────────────────────
-- Ofertas — entidade central, atravessa todo o ciclo de vida
-- ─────────────────────────────────────────────────────────────────────────────

create table ofertas (
  id                    uuid primary key default gen_random_uuid(),
  nome                  text not null,
  descricao             text not null,
  anunciante_referencia text,
  url_referencia        text,
  capa_url              text,
  nicho                 text,
  status                oferta_status not null default 'NA_PENEIRA',

  criada_por            uuid references membros (id) on delete set null,
  criada_em             timestamptz not null default now(),

  rodada_id             uuid references rodadas (id) on delete set null,
  roteiro_id            uuid references roteiros (id) on delete set null,
  ordem_na_rodada       int,
  data_prevista         date,
  escalada_em           timestamptz,

  data_conclusao        timestamptz,
  data_validacao        date,
  observacao_validacao  text,
  motivo_descarte       text,

  -- RN-10: validacao exige data.
  constraint ofertas_validacao_exige_data check (
    (status in ('VALIDADA', 'INVALIDADA')) = (data_validacao is not null)
  ),
  -- Oferta na esteira ou alem precisa de rodada, roteiro e data prevista.
  constraint ofertas_escalada_completa check (
    status in ('NA_PENEIRA', 'DESCARTADA')
    or (rodada_id is not null and roteiro_id is not null and data_prevista is not null)
  )
);

create index ofertas_status_idx        on ofertas (status);
create index ofertas_data_prevista_idx on ofertas (data_prevista);
create index ofertas_rodada_idx        on ofertas (rodada_id, ordem_na_rodada);
create index ofertas_criada_por_idx    on ofertas (criada_por);

-- ─────────────────────────────────────────────────────────────────────────────
-- Etapas da oferta — copia do roteiro no momento da escalacao (RN-04)
-- ─────────────────────────────────────────────────────────────────────────────

create table oferta_etapas (
  id               uuid primary key default gen_random_uuid(),
  oferta_id        uuid not null references ofertas (id) on delete cascade,
  roteiro_etapa_id uuid references roteiro_etapas (id) on delete set null,
  ordem            int not null,
  titulo           text not null,
  descricao        text,
  concluida        boolean not null default false,
  concluida_em     timestamptz,
  concluida_por    uuid references membros (id) on delete set null,

  constraint oferta_etapas_conclusao_coerente check (
    concluida = (concluida_em is not null)
  )
);

create index oferta_etapas_oferta_idx on oferta_etapas (oferta_id, ordem);

-- RN-06: uma etapa pode ter mais de um responsavel.
create table oferta_etapa_responsaveis (
  oferta_etapa_id uuid not null references oferta_etapas (id) on delete cascade,
  membro_id       uuid not null references membros (id) on delete cascade,
  origem          responsavel_origem not null default 'DELEGADO',
  primary key (oferta_etapa_id, membro_id)
);

create index oferta_etapa_responsaveis_membro_idx on oferta_etapa_responsaveis (membro_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Tarefas individuais (fora da esteira)
-- ─────────────────────────────────────────────────────────────────────────────

create table tarefas (
  id                  uuid primary key default gen_random_uuid(),
  titulo              text not null,
  descricao           text,
  prazo               date not null,
  prioridade          prioridade not null default 'NORMAL',
  oferta_id           uuid references ofertas (id) on delete set null,
  anexo_url           text,
  status              tarefa_status not null default 'ABERTA',
  criada_por          uuid references membros (id) on delete set null,
  criada_em           timestamptz not null default now(),
  concluida_em        timestamptz,
  concluida_por       uuid references membros (id) on delete set null,
  motivo_cancelamento text,

  constraint tarefas_conclusao_coerente check (
    (status = 'CONCLUIDA') = (concluida_em is not null)
  )
);

create index tarefas_prazo_idx  on tarefas (prazo);
create index tarefas_status_idx on tarefas (status);

create table tarefa_responsaveis (
  tarefa_id uuid not null references tarefas (id) on delete cascade,
  membro_id uuid not null references membros (id) on delete cascade,
  primary key (tarefa_id, membro_id)
);

create index tarefa_responsaveis_membro_idx on tarefa_responsaveis (membro_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Anexos e historico
-- ─────────────────────────────────────────────────────────────────────────────

create table oferta_anexos (
  id          uuid primary key default gen_random_uuid(),
  oferta_id   uuid not null references ofertas (id) on delete cascade,
  tipo        anexo_tipo not null,
  url         text not null,
  enviado_por uuid references membros (id) on delete set null,
  enviado_em  timestamptz not null default now()
);

create index oferta_anexos_oferta_idx on oferta_anexos (oferta_id);

create table oferta_eventos (
  id          uuid primary key default gen_random_uuid(),
  oferta_id   uuid not null references ofertas (id) on delete cascade,
  tipo        text not null,
  detalhe     jsonb not null default '{}'::jsonb,
  autor_id    uuid references membros (id) on delete set null,
  ocorrido_em timestamptz not null default now()
);

create index oferta_eventos_oferta_idx on oferta_eventos (oferta_id, ocorrido_em desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- Configuracao da instalacao
-- ─────────────────────────────────────────────────────────────────────────────

create table feriados (
  data      date primary key,
  descricao text not null
);

create table configuracoes (
  chave text primary key,
  valor jsonb not null
);
