-- Steera — autorizacao no banco (RNF-04)
-- Toda regra da matriz de permissoes (docs/PLANEJAMENTO.md §3.3) vive aqui.
-- A UI esconder um botao nunca e a unica barreira.

-- ─────────────────────────────────────────────────────────────────────────────
-- Funcoes auxiliares
--
-- SECURITY DEFINER de proposito: elas consultam `membros` a partir de policies
-- que estao sobre `membros`, o que causaria recursao infinita sob RLS.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.membro_ativo()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from membros where id = auth.uid() and ativo
  );
$$;

create or replace function public.e_chefe()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from membros where id = auth.uid() and ativo and cargo = 'CHEFE'
  );
$$;

create or replace function public.e_mestre_ou_chefe()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from membros m
    left join membro_funcoes mf on mf.membro_id = m.id and mf.funcao = 'MESTRE_ESTEIRA'
    where m.id = auth.uid()
      and m.ativo
      and (m.cargo = 'CHEFE' or mf.membro_id is not null)
  );
$$;

create or replace function public.e_responsavel_etapa(p_etapa_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from oferta_etapa_responsaveis
    where oferta_etapa_id = p_etapa_id and membro_id = auth.uid()
  );
$$;

create or replace function public.e_responsavel_tarefa(p_tarefa_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from tarefa_responsaveis
    where tarefa_id = p_tarefa_id and membro_id = auth.uid()
  );
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Ativacao do RLS
-- ─────────────────────────────────────────────────────────────────────────────

alter table membros                   enable row level security;
alter table membro_funcoes            enable row level security;
alter table roteiros                  enable row level security;
alter table roteiro_etapas            enable row level security;
alter table roteiro_etapa_funcoes     enable row level security;
alter table rodadas                   enable row level security;
alter table ofertas                   enable row level security;
alter table oferta_etapas             enable row level security;
alter table oferta_etapa_responsaveis enable row level security;
alter table tarefas                   enable row level security;
alter table tarefa_responsaveis       enable row level security;
alter table oferta_anexos             enable row level security;
alter table oferta_eventos            enable row level security;
alter table feriados                  enable row level security;
alter table configuracoes             enable row level security;

-- ─────────────────────────────────────────────────────────────────────────────
-- Equipe
-- ─────────────────────────────────────────────────────────────────────────────

-- O `or id = auth.uid()` deixa o membro recem-convidado (ainda inativo) ler o
-- proprio perfil; sem isso ele nao consegue nem carregar a tela de conta.
create policy membros_leitura on membros
  for select using (public.membro_ativo() or id = auth.uid());

create policy membros_insercao on membros
  for insert with check (public.e_chefe());

create policy membros_atualizacao on membros
  for update using (public.e_chefe() or id = auth.uid());

create policy membro_funcoes_leitura on membro_funcoes
  for select using (public.membro_ativo());

create policy membro_funcoes_escrita on membro_funcoes
  for all using (public.e_chefe()) with check (public.e_chefe());

-- ─────────────────────────────────────────────────────────────────────────────
-- Roteiros
-- ─────────────────────────────────────────────────────────────────────────────

create policy roteiros_leitura on roteiros
  for select using (public.membro_ativo());

create policy roteiros_escrita on roteiros
  for all using (public.e_mestre_ou_chefe()) with check (public.e_mestre_ou_chefe());

create policy roteiro_etapas_leitura on roteiro_etapas
  for select using (public.membro_ativo());

create policy roteiro_etapas_escrita on roteiro_etapas
  for all using (public.e_mestre_ou_chefe()) with check (public.e_mestre_ou_chefe());

create policy roteiro_etapa_funcoes_leitura on roteiro_etapa_funcoes
  for select using (public.membro_ativo());

create policy roteiro_etapa_funcoes_escrita on roteiro_etapa_funcoes
  for all using (public.e_mestre_ou_chefe()) with check (public.e_mestre_ou_chefe());

-- ─────────────────────────────────────────────────────────────────────────────
-- Rodadas
-- ─────────────────────────────────────────────────────────────────────────────

create policy rodadas_leitura on rodadas
  for select using (public.membro_ativo());

create policy rodadas_escrita on rodadas
  for all using (public.e_mestre_ou_chefe()) with check (public.e_mestre_ou_chefe());

-- ─────────────────────────────────────────────────────────────────────────────
-- Ofertas
-- ─────────────────────────────────────────────────────────────────────────────

create policy ofertas_leitura on ofertas
  for select using (public.membro_ativo());

-- Qualquer membro cadastra ideia, mas so em nome de si mesmo.
create policy ofertas_insercao on ofertas
  for insert with check (public.membro_ativo() and criada_por = auth.uid());

-- Autor edita a propria ideia enquanto ela esta na Peneira; depois disso,
-- so Chefe e Mestre da Esteira.
create policy ofertas_atualizacao on ofertas
  for update using (
    public.e_mestre_ou_chefe()
    or (status = 'NA_PENEIRA' and criada_por = auth.uid())
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- Etapas da oferta
-- ─────────────────────────────────────────────────────────────────────────────

create policy oferta_etapas_leitura on oferta_etapas
  for select using (public.membro_ativo());

create policy oferta_etapas_insercao on oferta_etapas
  for insert with check (public.e_mestre_ou_chefe());

-- RN-07: funcionario so marca etapa em que e um dos responsaveis.
create policy oferta_etapas_atualizacao on oferta_etapas
  for update using (public.e_mestre_ou_chefe() or public.e_responsavel_etapa(id));

create policy oferta_etapas_remocao on oferta_etapas
  for delete using (public.e_mestre_ou_chefe());

create policy oferta_etapa_responsaveis_leitura on oferta_etapa_responsaveis
  for select using (public.membro_ativo());

create policy oferta_etapa_responsaveis_escrita on oferta_etapa_responsaveis
  for all using (public.e_mestre_ou_chefe()) with check (public.e_mestre_ou_chefe());

-- ─────────────────────────────────────────────────────────────────────────────
-- Tarefas individuais
-- ─────────────────────────────────────────────────────────────────────────────

-- RF-07.6: Chefe e Mestre veem todas; funcionario ve so as suas.
create policy tarefas_leitura on tarefas
  for select using (public.e_mestre_ou_chefe() or public.e_responsavel_tarefa(id));

-- RN-13: so Chefe e Mestre criam.
create policy tarefas_insercao on tarefas
  for insert with check (public.e_mestre_ou_chefe());

-- O responsavel pode concluir a sua; editar o resto e so de Chefe/Mestre
-- (garantido pelo trigger fn_tarefa_edicao_restrita).
create policy tarefas_atualizacao on tarefas
  for update using (public.e_mestre_ou_chefe() or public.e_responsavel_tarefa(id));

create policy tarefas_remocao on tarefas
  for delete using (public.e_mestre_ou_chefe());

create policy tarefa_responsaveis_leitura on tarefa_responsaveis
  for select using (public.e_mestre_ou_chefe() or membro_id = auth.uid());

create policy tarefa_responsaveis_escrita on tarefa_responsaveis
  for all using (public.e_mestre_ou_chefe()) with check (public.e_mestre_ou_chefe());

-- ─────────────────────────────────────────────────────────────────────────────
-- Anexos e historico
-- ─────────────────────────────────────────────────────────────────────────────

create policy oferta_anexos_leitura on oferta_anexos
  for select using (public.membro_ativo());

create policy oferta_anexos_insercao on oferta_anexos
  for insert with check (public.membro_ativo() and enviado_por = auth.uid());

create policy oferta_anexos_remocao on oferta_anexos
  for delete using (public.e_mestre_ou_chefe());

create policy oferta_eventos_leitura on oferta_eventos
  for select using (public.membro_ativo());

create policy oferta_eventos_insercao on oferta_eventos
  for insert with check (public.membro_ativo());

-- Historico e imutavel: sem policy de update nem de delete.

-- ─────────────────────────────────────────────────────────────────────────────
-- Configuracao
-- ─────────────────────────────────────────────────────────────────────────────

create policy feriados_leitura on feriados
  for select using (public.membro_ativo());

create policy feriados_escrita on feriados
  for all using (public.e_chefe()) with check (public.e_chefe());

create policy configuracoes_leitura on configuracoes
  for select using (public.membro_ativo());

create policy configuracoes_escrita on configuracoes
  for all using (public.e_chefe()) with check (public.e_chefe());
