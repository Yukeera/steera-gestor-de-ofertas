-- Steera — Tarefas individuais
--
-- Uma tarefa e seus responsáveis são duas tabelas. Gravadas em chamadas
-- separadas, uma falha no meio deixaria a tarefa sem dono nenhum — visível
-- só para quem a criou, e invisível para quem deveria executá-la.

create or replace function public.salvar_tarefa(
  p_id           uuid,
  p_titulo       text,
  p_descricao    text,
  p_prazo        date,
  p_prioridade   prioridade,
  p_oferta_id    uuid,
  p_responsaveis uuid[]
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid := p_id;
begin
  -- RN-13: só Chefe e Mestre da Esteira designam trabalho.
  if not public.e_mestre_ou_chefe() then
    raise exception 'Só o Chefe e o Mestre da Esteira criam tarefas.'
      using errcode = 'insufficient_privilege';
  end if;

  if coalesce(trim(p_titulo), '') = '' then
    raise exception 'A tarefa precisa de um título.'
      using errcode = 'check_violation';
  end if;

  if p_responsaveis is null or array_length(p_responsaveis, 1) is null then
    raise exception 'Escolha ao menos uma pessoa para a tarefa.'
      using errcode = 'check_violation';
  end if;

  if exists (
    select 1
      from unnest(p_responsaveis) r(id)
     where not exists (
       select 1 from membros m where m.id = r.id and m.ativo
     )
  ) then
    raise exception 'Só dá para designar tarefa a membro ativo.'
      using errcode = 'check_violation';
  end if;

  if v_id is null then
    insert into tarefas (titulo, descricao, prazo, prioridade, oferta_id, criada_por)
    values (
      trim(p_titulo),
      nullif(trim(coalesce(p_descricao, '')), ''),
      p_prazo,
      p_prioridade,
      p_oferta_id,
      auth.uid()
    )
    returning id into v_id;
  else
    update tarefas
       set titulo     = trim(p_titulo),
           descricao  = nullif(trim(coalesce(p_descricao, '')), ''),
           prazo      = p_prazo,
           prioridade = p_prioridade,
           oferta_id  = p_oferta_id
     where id = v_id;

    if not found then
      raise exception 'Tarefa não encontrada.'
        using errcode = 'check_violation';
    end if;
  end if;

  -- Troca o conjunto inteiro: são poucas linhas, e calcular a diferença
  -- renderia mais código do que economia.
  delete from tarefa_responsaveis where tarefa_id = v_id;

  insert into tarefa_responsaveis (tarefa_id, membro_id)
  select v_id, r.id from unnest(p_responsaveis) r(id)
  on conflict do nothing;

  return v_id;
end;
$$;

grant execute on function public.salvar_tarefa(uuid, text, text, date, prioridade, uuid, uuid[])
  to authenticated;
