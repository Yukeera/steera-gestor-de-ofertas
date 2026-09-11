-- Steera — regras de negocio aplicadas no banco
-- Transicoes automaticas e travas que nao podem depender da UI.
-- Ver docs/PLANEJAMENTO.md §8.

-- ─────────────────────────────────────────────────────────────────────────────
-- RN-08 / RN-09 — a oferta conclui sozinha quando o roteiro fecha
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.fn_sincroniza_status_oferta()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_oferta_id  uuid := coalesce(new.oferta_id, old.oferta_id);
  v_total      int;
  v_concluidas int;
  v_status     oferta_status;
begin
  select status into v_status from ofertas where id = v_oferta_id;

  -- Oferta ja julgada nao volta atras por mexida em etapa.
  if v_status in ('VALIDADA', 'INVALIDADA') then
    raise exception
      'A oferta ja foi validada ou invalidada; suas etapas nao podem mais mudar.'
      using errcode = 'check_violation';
  end if;

  select count(*), count(*) filter (where concluida)
    into v_total, v_concluidas
    from oferta_etapas
   where oferta_id = v_oferta_id;

  if v_total > 0 and v_concluidas = v_total and v_status = 'NA_ESTEIRA' then
    update ofertas
       set status = 'CONCLUIDA', data_conclusao = now()
     where id = v_oferta_id;

  elsif v_concluidas < v_total and v_status = 'CONCLUIDA' then
    update ofertas
       set status = 'NA_ESTEIRA', data_conclusao = null
     where id = v_oferta_id;
  end if;

  return null;
end;
$$;

create trigger trg_sincroniza_status_oferta
  after insert or update of concluida or delete on oferta_etapas
  for each row execute function public.fn_sincroniza_status_oferta();

-- ─────────────────────────────────────────────────────────────────────────────
-- Carimbo de quem concluiu a etapa — nao confiar no cliente
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.fn_carimba_conclusao_etapa()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.concluida and not coalesce(old.concluida, false) then
    new.concluida_em  := now();
    new.concluida_por := auth.uid();
  elsif not new.concluida and coalesce(old.concluida, false) then
    new.concluida_em  := null;
    new.concluida_por := null;
  end if;
  return new;
end;
$$;

create trigger trg_carimba_conclusao_etapa
  before update of concluida on oferta_etapas
  for each row execute function public.fn_carimba_conclusao_etapa();

-- ─────────────────────────────────────────────────────────────────────────────
-- RN-11 — a rodada fecha quando todas as suas ofertas fecham
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.fn_sincroniza_status_rodada()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rodada_id uuid := coalesce(new.rodada_id, old.rodada_id);
  v_abertas   int;
  v_total     int;
begin
  if v_rodada_id is null then
    return null;
  end if;

  select count(*),
         count(*) filter (where status in ('NA_PENEIRA', 'NA_ESTEIRA'))
    into v_total, v_abertas
    from ofertas
   where rodada_id = v_rodada_id;

  update rodadas
     set status = case
                    when v_total = 0    then 'PLANEJADA'::rodada_status
                    when v_abertas = 0  then 'CONCLUIDA'::rodada_status
                    else 'EM_ANDAMENTO'::rodada_status
                  end
   where id = v_rodada_id
     and status <> 'CANCELADA';

  return null;
end;
$$;

create trigger trg_sincroniza_status_rodada
  after insert or update of status, rodada_id or delete on ofertas
  for each row execute function public.fn_sincroniza_status_rodada();

-- ─────────────────────────────────────────────────────────────────────────────
-- RN-16 — todo passo do ciclo de vida vai para o historico
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.fn_registra_evento_oferta()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tipo text;
begin
  if tg_op = 'INSERT' then
    insert into oferta_eventos (oferta_id, tipo, autor_id)
    values (new.id, 'CRIADA', new.criada_por);
    return null;
  end if;

  if new.status is distinct from old.status then
    v_tipo := case new.status
                when 'NA_ESTEIRA'  then 'ESCALADA'
                when 'CONCLUIDA'   then 'CONCLUIDA'
                when 'VALIDADA'    then 'VALIDADA'
                when 'INVALIDADA'  then 'INVALIDADA'
                when 'DESCARTADA'  then 'DESCARTADA'
                when 'NA_PENEIRA'  then 'DEVOLVIDA_PENEIRA'
              end;

    insert into oferta_eventos (oferta_id, tipo, detalhe, autor_id)
    values (
      new.id,
      v_tipo,
      jsonb_build_object('de', old.status, 'para', new.status),
      auth.uid()
    );
  end if;

  if new.data_prevista is distinct from old.data_prevista
     and old.data_prevista is not null then
    insert into oferta_eventos (oferta_id, tipo, detalhe, autor_id)
    values (
      new.id,
      'REMANEJADA',
      jsonb_build_object('de', old.data_prevista, 'para', new.data_prevista),
      auth.uid()
    );
  end if;

  return null;
end;
$$;

create trigger trg_registra_evento_oferta
  after insert or update on ofertas
  for each row execute function public.fn_registra_evento_oferta();

create or replace function public.fn_registra_evento_delegacao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_oferta_id uuid;
begin
  select oferta_id into v_oferta_id
    from oferta_etapas
   where id = coalesce(new.oferta_etapa_id, old.oferta_etapa_id);

  insert into oferta_eventos (oferta_id, tipo, detalhe, autor_id)
  values (
    v_oferta_id,
    case when tg_op = 'INSERT' then 'ETAPA_DELEGADA' else 'ETAPA_LIBERADA' end,
    jsonb_build_object(
      'etapa_id', coalesce(new.oferta_etapa_id, old.oferta_etapa_id),
      'membro_id', coalesce(new.membro_id, old.membro_id)
    ),
    auth.uid()
  );

  return null;
end;
$$;

create trigger trg_registra_evento_delegacao
  after insert or delete on oferta_etapa_responsaveis
  for each row execute function public.fn_registra_evento_delegacao();

-- ─────────────────────────────────────────────────────────────────────────────
-- Travas de escalada de privilegio
-- ─────────────────────────────────────────────────────────────────────────────

-- A policy de update em `membros` deixa a pessoa editar o proprio perfil.
-- Sem esta trava, ela poderia se promover a CHEFE na mesma chamada.
create or replace function public.fn_bloqueia_autopromocao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.e_chefe() then
    return new;
  end if;

  if new.cargo is distinct from old.cargo
     or new.ativo is distinct from old.ativo
     or new.email is distinct from old.email then
    raise exception 'Apenas o Chefe pode alterar cargo, e-mail ou status de um membro.'
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end;
$$;

create trigger trg_bloqueia_autopromocao
  before update on membros
  for each row execute function public.fn_bloqueia_autopromocao();

-- O responsavel pode concluir a propria tarefa, mas nao reescrever o pedido.
create or replace function public.fn_tarefa_edicao_restrita()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.e_mestre_ou_chefe() then
    return new;
  end if;

  if new.titulo     is distinct from old.titulo
     or new.descricao  is distinct from old.descricao
     or new.prazo      is distinct from old.prazo
     or new.prioridade is distinct from old.prioridade
     or new.oferta_id  is distinct from old.oferta_id
     or new.status = 'CANCELADA' then
    raise exception 'Voce so pode marcar esta tarefa como concluida.'
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end;
$$;

create trigger trg_tarefa_edicao_restrita
  before update on tarefas
  for each row execute function public.fn_tarefa_edicao_restrita();

create or replace function public.fn_carimba_conclusao_tarefa()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.status = 'CONCLUIDA' and old.status <> 'CONCLUIDA' then
    new.concluida_em  := now();
    new.concluida_por := auth.uid();
  elsif new.status <> 'CONCLUIDA' and old.status = 'CONCLUIDA' then
    new.concluida_em  := null;
    new.concluida_por := null;
  end if;
  return new;
end;
$$;

create trigger trg_carimba_conclusao_tarefa
  before update of status on tarefas
  for each row execute function public.fn_carimba_conclusao_tarefa();

-- ─────────────────────────────────────────────────────────────────────────────
-- RN-02 — distribuicao da rodada em dias uteis
-- ─────────────────────────────────────────────────────────────────────────────

-- Proximo dia util a partir de (inclusive) p_data, pulando sabado, domingo
-- e feriados cadastrados.
create or replace function public.proximo_dia_util(p_data date)
returns date
language plpgsql
stable
set search_path = public
as $$
declare
  v_data date := p_data;
begin
  loop
    exit when extract(isodow from v_data) < 6
          and not exists (select 1 from feriados where data = v_data);
    v_data := v_data + 1;
  end loop;
  return v_data;
end;
$$;

-- Sequencia de p_quantidade dias uteis a partir de p_inicio.
create or replace function public.dias_uteis(p_inicio date, p_quantidade int)
returns setof date
language plpgsql
stable
set search_path = public
as $$
declare
  v_data date := p_inicio;
  i      int;
begin
  for i in 1 .. p_quantidade loop
    v_data := public.proximo_dia_util(v_data);
    return next v_data;
    v_data := v_data + 1;
  end loop;
end;
$$;
