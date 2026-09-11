-- Steera — escalação de Rodadas
--
-- Escalar uma Rodada é a operação mais pesada do sistema: para cada oferta,
-- muda o status, grava a data prevista, copia as etapas do roteiro e
-- pré-preenche os responsáveis. Cinco tabelas, várias linhas cada.
--
-- Se isso fosse uma sequência de chamadas do supabase-js, uma falha no meio
-- deixaria metade das ofertas na esteira sem etapa nenhuma — e a oferta estaria
-- fora da Peneira, sem caminho de volta pela interface. Por isso é uma
-- transação só.

-- ─────────────────────────────────────────────────────────────────────────────
-- Copia um roteiro para dentro de uma oferta
--
-- É a materialização da RN-04: a oferta leva uma CÓPIA, não uma referência.
-- Editar o roteiro depois não altera nada que já está na esteira.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.instanciar_roteiro(
  p_oferta_id  uuid,
  p_roteiro_id uuid
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_etapa      record;
  v_etapa_nova uuid;
begin
  delete from oferta_etapas where oferta_id = p_oferta_id;

  for v_etapa in
    select id, ordem, titulo, descricao
      from roteiro_etapas
     where roteiro_id = p_roteiro_id
     order by ordem
  loop
    insert into oferta_etapas (oferta_id, roteiro_etapa_id, ordem, titulo, descricao)
    values (p_oferta_id, v_etapa.id, v_etapa.ordem, v_etapa.titulo, v_etapa.descricao)
    returning id into v_etapa_nova;

    -- RN-05: o responsável só é pré-preenchido quando a função sugerida tem
    -- exatamente um membro ativo. Com duas pessoas na mesma função, escolher
    -- uma seria adivinhar — a vaga fica aberta para o Mestre delegar.
    insert into oferta_etapa_responsaveis (oferta_etapa_id, membro_id, origem)
    select v_etapa_nova, unico.id, 'SUGERIDO'
      from roteiro_etapa_funcoes ref
      cross join lateral (
        select m.id
          from membro_funcoes mf
          join membros m on m.id = mf.membro_id and m.ativo
         where mf.funcao = ref.funcao
      ) unico
     where ref.roteiro_etapa_id = v_etapa.id
       and (
         select count(*)
           from membro_funcoes mf2
           join membros m2 on m2.id = mf2.membro_id and m2.ativo
          where mf2.funcao = ref.funcao
       ) = 1
    on conflict do nothing;
  end loop;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Cria a Rodada e escala as ofertas
--
-- `p_ofertas` é um array JSON NA ORDEM da esteira:
--   [{ "oferta_id": "...", "roteiro_id": "..." }, ...]
--
-- RN-02: uma oferta por dia útil a partir de `p_data_inicio`, pulando sábado,
-- domingo e feriados cadastrados.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.criar_rodada(
  p_nome        text,
  p_data_inicio date,
  p_observacoes text,
  p_ofertas     jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_rodada_id uuid;
  v_item      jsonb;
  v_oferta_id uuid;
  v_roteiro_id uuid;
  v_nome_oferta text;
  v_status    oferta_status;
  v_cursor    date := p_data_inicio;
  v_data      date;
  v_ordem     int := 0;
begin
  if not public.e_mestre_ou_chefe() then
    raise exception 'Apenas o Chefe e o Mestre da Esteira montam Rodadas.'
      using errcode = 'insufficient_privilege';
  end if;

  if coalesce(trim(p_nome), '') = '' then
    raise exception 'A Rodada precisa de um nome.'
      using errcode = 'check_violation';
  end if;

  if jsonb_typeof(p_ofertas) <> 'array' or jsonb_array_length(p_ofertas) = 0 then
    raise exception 'Escolha ao menos uma oferta para a Rodada.'
      using errcode = 'check_violation';
  end if;

  insert into rodadas (nome, data_inicio, observacoes, status, criada_por)
  values (
    trim(p_nome),
    p_data_inicio,
    nullif(trim(coalesce(p_observacoes, '')), ''),
    'EM_ANDAMENTO',
    auth.uid()
  )
  returning id into v_rodada_id;

  for v_item in select * from jsonb_array_elements(p_ofertas) loop
    v_oferta_id  := (v_item->>'oferta_id')::uuid;
    v_roteiro_id := (v_item->>'roteiro_id')::uuid;

    -- `for update` segura a linha até o fim da transação: duas pessoas
    -- montando Rodadas ao mesmo tempo não escalam a mesma oferta duas vezes.
    select status, nome into v_status, v_nome_oferta
      from ofertas where id = v_oferta_id for update;

    if v_status is null then
      raise exception 'Oferta % não existe.', v_oferta_id
        using errcode = 'check_violation';
    end if;

    -- RN-01: só sai da Peneira o que está na Peneira.
    if v_status <> 'NA_PENEIRA' then
      raise exception 'A oferta "%" já saiu da Peneira e não pode entrar nesta Rodada.',
        v_nome_oferta using errcode = 'check_violation';
    end if;

    if not exists (select 1 from roteiro_etapas where roteiro_id = v_roteiro_id) then
      raise exception 'O roteiro escolhido para "%" não tem etapa nenhuma.',
        v_nome_oferta using errcode = 'check_violation';
    end if;

    v_data  := public.proximo_dia_util(v_cursor);
    v_ordem := v_ordem + 1;

    update ofertas
       set rodada_id       = v_rodada_id,
           roteiro_id      = v_roteiro_id,
           ordem_na_rodada = v_ordem,
           data_prevista   = v_data,
           escalada_em     = now(),
           status          = 'NA_ESTEIRA'
     where id = v_oferta_id;

    perform public.instanciar_roteiro(v_oferta_id, v_roteiro_id);

    v_cursor := v_data + 1;
  end loop;

  return v_rodada_id;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- RF-04.5 — acrescenta uma oferta a uma Rodada já em andamento
--
-- Entra no primeiro dia útil livre depois da última oferta da Rodada, para não
-- empurrar o que a equipe já organizou.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.adicionar_oferta_rodada(
  p_rodada_id  uuid,
  p_oferta_id  uuid,
  p_roteiro_id uuid
)
returns date
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_status oferta_status;
  v_data   date;
  v_ordem  int;
begin
  if not public.e_mestre_ou_chefe() then
    raise exception 'Apenas o Chefe e o Mestre da Esteira mexem nas Rodadas.'
      using errcode = 'insufficient_privilege';
  end if;

  select status into v_status from ofertas where id = p_oferta_id for update;

  if v_status is distinct from 'NA_PENEIRA' then
    raise exception 'Só entra em Rodada o que está na Peneira.'
      using errcode = 'check_violation';
  end if;

  select coalesce(max(data_prevista) + 1, (select data_inicio from rodadas where id = p_rodada_id)),
         coalesce(max(ordem_na_rodada), 0) + 1
    into v_data, v_ordem
    from ofertas where rodada_id = p_rodada_id;

  v_data := public.proximo_dia_util(v_data);

  update ofertas
     set rodada_id       = p_rodada_id,
         roteiro_id      = p_roteiro_id,
         ordem_na_rodada = v_ordem,
         data_prevista   = v_data,
         escalada_em     = now(),
         status          = 'NA_ESTEIRA'
   where id = p_oferta_id;

  perform public.instanciar_roteiro(p_oferta_id, p_roteiro_id);

  return v_data;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- RF-04.5 — tira uma oferta da Rodada e devolve para a Peneira
--
-- Bloqueado se alguma etapa já foi concluída: apagar trabalho feito sem aviso
-- é pior do que obrigar o Mestre a resolver na mão.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.remover_oferta_rodada(p_oferta_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_status oferta_status;
begin
  if not public.e_mestre_ou_chefe() then
    raise exception 'Apenas o Chefe e o Mestre da Esteira mexem nas Rodadas.'
      using errcode = 'insufficient_privilege';
  end if;

  select status into v_status from ofertas where id = p_oferta_id for update;

  if v_status is distinct from 'NA_ESTEIRA' then
    raise exception 'Só dá para devolver à Peneira uma oferta que está na esteira.'
      using errcode = 'check_violation';
  end if;

  if exists (
    select 1 from oferta_etapas where oferta_id = p_oferta_id and concluida
  ) then
    raise exception 'Esta oferta já tem etapa concluída. Devolvê-la apagaria trabalho feito.'
      using errcode = 'check_violation';
  end if;

  delete from oferta_etapas where oferta_id = p_oferta_id;

  update ofertas
     set rodada_id       = null,
         roteiro_id      = null,
         ordem_na_rodada = null,
         data_prevista   = null,
         escalada_em     = null,
         status          = 'NA_PENEIRA'
   where id = p_oferta_id;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- RN-12 — cancela a Rodada e devolve tudo para a Peneira
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.cancelar_rodada(p_rodada_id uuid)
returns int
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_oferta record;
  v_devolvidas int := 0;
begin
  if not public.e_mestre_ou_chefe() then
    raise exception 'Apenas o Chefe e o Mestre da Esteira cancelam Rodadas.'
      using errcode = 'insufficient_privilege';
  end if;

  if exists (
    select 1
      from ofertas o
      join oferta_etapas e on e.oferta_id = o.id
     where o.rodada_id = p_rodada_id and e.concluida
  ) then
    raise exception 'Há etapas concluídas nesta Rodada. Remova as ofertas uma a uma para não apagar trabalho feito.'
      using errcode = 'check_violation';
  end if;

  for v_oferta in
    select id from ofertas where rodada_id = p_rodada_id and status = 'NA_ESTEIRA'
  loop
    perform public.remover_oferta_rodada(v_oferta.id);
    v_devolvidas := v_devolvidas + 1;
  end loop;

  update rodadas set status = 'CANCELADA' where id = p_rodada_id;

  return v_devolvidas;
end;
$$;

grant execute on function public.instanciar_roteiro(uuid, uuid)              to authenticated;
grant execute on function public.criar_rodada(text, date, text, jsonb)       to authenticated;
grant execute on function public.adicionar_oferta_rodada(uuid, uuid, uuid)   to authenticated;
grant execute on function public.remover_oferta_rodada(uuid)                 to authenticated;
grant execute on function public.cancelar_rodada(uuid)                       to authenticated;
