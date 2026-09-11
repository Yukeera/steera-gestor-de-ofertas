-- Steera — operações transacionais de Roteiro
--
-- Editar um roteiro e trocar o padrão mexem em várias linhas de uma vez.
-- Feitas pelo supabase-js seriam várias chamadas HTTP independentes, e uma
-- falha no meio deixaria o roteiro sem etapas ou nenhum roteiro como padrão.
-- Por isso vivem aqui, onde são uma transação só (ver PLANEJAMENTO §9.3).

-- ─────────────────────────────────────────────────────────────────────────────
-- Substitui a lista de etapas de um roteiro
--
-- `p_etapas` é um array JSON na ordem desejada:
--   [{ "titulo": "...", "descricao": "...", "funcoes": ["GARIMPEIRO"] }, ...]
--
-- A ordem vem da posição no array, não de um campo: assim a interface não tem
-- como mandar ordens duplicadas ou com buracos.
--
-- Apagar e reinserir perde os ids das etapas, e isso é aceitável de propósito:
-- `oferta_etapas` guarda uma CÓPIA do roteiro (RN-04), então ofertas em
-- andamento não são afetadas. A referência `roteiro_etapa_id` é só procedência
-- e vira null sozinha.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.salvar_roteiro_etapas(
  p_roteiro_id uuid,
  p_etapas     jsonb
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_etapa  jsonb;
  v_id     uuid;
  v_ordem  int := 0;
  v_funcao text;
begin
  if not public.e_mestre_ou_chefe() then
    raise exception 'Apenas o Chefe e o Mestre da Esteira editam roteiros.'
      using errcode = 'insufficient_privilege';
  end if;

  if jsonb_typeof(p_etapas) <> 'array' then
    raise exception 'A lista de etapas precisa ser um array.'
      using errcode = 'invalid_parameter_value';
  end if;

  if jsonb_array_length(p_etapas) = 0 then
    raise exception 'Um roteiro sem etapa nenhuma não monta oferta.'
      using errcode = 'check_violation';
  end if;

  delete from roteiro_etapas where roteiro_id = p_roteiro_id;

  for v_etapa in select * from jsonb_array_elements(p_etapas) loop
    v_ordem := v_ordem + 1;

    if coalesce(trim(v_etapa->>'titulo'), '') = '' then
      raise exception 'A etapa % está sem título.', v_ordem
        using errcode = 'check_violation';
    end if;

    insert into roteiro_etapas (roteiro_id, ordem, titulo, descricao)
    values (
      p_roteiro_id,
      v_ordem,
      trim(v_etapa->>'titulo'),
      nullif(trim(coalesce(v_etapa->>'descricao', '')), '')
    )
    returning id into v_id;

    for v_funcao in
      select jsonb_array_elements_text(coalesce(v_etapa->'funcoes', '[]'::jsonb))
    loop
      insert into roteiro_etapa_funcoes (roteiro_etapa_id, funcao)
      values (v_id, v_funcao::funcao)
      on conflict do nothing;
    end loop;
  end loop;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Troca o roteiro padrão
--
-- O índice único parcial (RN-17) impede dois padrões ao mesmo tempo, então
-- limpar e marcar precisam acontecer na mesma transação — senão a primeira
-- metade sozinha deixaria a instalação sem padrão nenhum.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.definir_roteiro_padrao(p_roteiro_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not public.e_mestre_ou_chefe() then
    raise exception 'Apenas o Chefe e o Mestre da Esteira definem o padrão.'
      using errcode = 'insufficient_privilege';
  end if;

  if not exists (
    select 1 from roteiros where id = p_roteiro_id and not arquivado
  ) then
    raise exception 'Roteiro arquivado ou inexistente não pode virar padrão.'
      using errcode = 'check_violation';
  end if;

  update roteiros set e_padrao = false where e_padrao;
  update roteiros set e_padrao = true  where id = p_roteiro_id;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- RF-03.5 — roteiro em uso não some
--
-- Arquivar em vez de excluir. Excluir de verdade quebraria a procedência das
-- ofertas que já foram montadas com ele.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.arquivar_roteiro(
  p_roteiro_id uuid,
  p_arquivado  boolean
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not public.e_mestre_ou_chefe() then
    raise exception 'Apenas o Chefe e o Mestre da Esteira arquivam roteiros.'
      using errcode = 'insufficient_privilege';
  end if;

  if p_arquivado and exists (
    select 1 from roteiros where id = p_roteiro_id and e_padrao
  ) then
    raise exception 'Escolha outro roteiro como padrão antes de arquivar este.'
      using errcode = 'check_violation';
  end if;

  update roteiros set arquivado = p_arquivado where id = p_roteiro_id;
end;
$$;

grant execute on function public.salvar_roteiro_etapas(uuid, jsonb) to authenticated;
grant execute on function public.definir_roteiro_padrao(uuid)       to authenticated;
grant execute on function public.arquivar_roteiro(uuid, boolean)    to authenticated;
