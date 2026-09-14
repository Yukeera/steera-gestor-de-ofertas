-- Steera — notificações (RF-11.1)
--
-- Gravadas por trigger, não pela aplicação: a notificação precisa existir
-- mesmo quando a delegação veio por um caminho que ninguém previu — uma
-- correção no SQL Editor, um script, uma tela futura. Se dependesse da
-- interface lembrar de criar, um dia ela esqueceria.

create type notificacao_tipo as enum ('ETAPA_DELEGADA', 'TAREFA_DESIGNADA');

create table notificacoes (
  id        uuid primary key default gen_random_uuid(),
  membro_id uuid not null references membros (id) on delete cascade,
  tipo      notificacao_tipo not null,
  titulo    text not null,
  contexto  text,
  href      text not null,
  lida      boolean not null default false,
  criada_em timestamptz not null default now()
);

create index notificacoes_caixa_idx
  on notificacoes (membro_id, lida, criada_em desc);

alter table notificacoes enable row level security;

-- Notificação é estritamente pessoal: nem o Chefe lê a dos outros.
create policy notificacoes_leitura on notificacoes
  for select using (membro_id = auth.uid());

-- Só dá para marcar como lida. Quem escreve o resto são os triggers.
create policy notificacoes_atualizacao on notificacoes
  for update using (membro_id = auth.uid());

create policy notificacoes_remocao on notificacoes
  for delete using (membro_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- Delegação de etapa
--
-- Só `DELEGADO`. O `SUGERIDO` do pré-preenchimento da Rodada dispararia uma
-- notificação por etapa no momento da escalação — oito ofertas viram dezenas
-- de avisos de uma vez, e a pessoa já vê tudo isso na tela Hoje. Notificação
-- que chega em lote deixa de ser lida.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.fn_notifica_delegacao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_titulo text;
  v_oferta_id uuid;
  v_oferta_nome text;
begin
  if new.origem <> 'DELEGADO' then
    return null;
  end if;

  -- Quem se atribui não precisa ser avisado de que se atribuiu.
  if new.membro_id = auth.uid() then
    return null;
  end if;

  select e.titulo, o.id, o.nome
    into v_titulo, v_oferta_id, v_oferta_nome
    from oferta_etapas e
    join ofertas o on o.id = e.oferta_id
   where e.id = new.oferta_etapa_id;

  if v_oferta_id is null then
    return null;
  end if;

  insert into notificacoes (membro_id, tipo, titulo, contexto, href)
  values (
    new.membro_id,
    'ETAPA_DELEGADA',
    v_titulo,
    v_oferta_nome,
    '/ofertas/' || v_oferta_id
  );

  return null;
end;
$$;

create trigger trg_notifica_delegacao
  after insert on oferta_etapa_responsaveis
  for each row execute function public.fn_notifica_delegacao();

-- ─────────────────────────────────────────────────────────────────────────────
-- Tarefa designada
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.fn_notifica_tarefa()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_titulo text;
  v_prazo  date;
begin
  if new.membro_id = auth.uid() then
    return null;
  end if;

  select titulo, prazo into v_titulo, v_prazo
    from tarefas where id = new.tarefa_id;

  if v_titulo is null then
    return null;
  end if;

  insert into notificacoes (membro_id, tipo, titulo, contexto, href)
  values (
    new.membro_id,
    'TAREFA_DESIGNADA',
    v_titulo,
    'prazo ' || to_char(v_prazo, 'DD/MM'),
    '/tarefas'
  );

  return null;
end;
$$;

create trigger trg_notifica_tarefa
  after insert on tarefa_responsaveis
  for each row execute function public.fn_notifica_tarefa();

-- ─────────────────────────────────────────────────────────────────────────────
-- Limpeza
--
-- Sem isto a tabela cresce para sempre. Notificação lida com mais de 30 dias
-- não tem leitor: ou a pessoa agiu, ou o assunto morreu.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.limpar_notificacoes_antigas()
returns int
language sql
security definer
set search_path = public
as $$
  with removidas as (
    delete from notificacoes
     where lida and criada_em < now() - interval '30 days'
    returning 1
  )
  select count(*)::int from removidas;
$$;
