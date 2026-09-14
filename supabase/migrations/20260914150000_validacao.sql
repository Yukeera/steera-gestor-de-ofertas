-- Steera — validação da oferta (RF-08.4)
--
-- É o julgamento final: a oferta foi ao mercado e deu certo, ou não. Tudo que
-- o Painel mede sai daqui, então a transição precisa ser difícil de errar.

create or replace function public.validar_oferta(
  p_oferta_id  uuid,
  p_validada   boolean,
  p_data       date,
  p_observacao text
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_status oferta_status;
begin
  if not public.e_mestre_ou_chefe() then
    raise exception 'Apenas o Chefe e o Mestre da Esteira validam ofertas.'
      using errcode = 'insufficient_privilege';
  end if;

  select status into v_status from ofertas where id = p_oferta_id for update;

  if v_status is null then
    raise exception 'Oferta não encontrada.' using errcode = 'check_violation';
  end if;

  -- Só se julga o que já está montado. Validar algo ainda na esteira diria
  -- que o teste aconteceu antes de a oferta existir.
  if v_status not in ('CONCLUIDA', 'VALIDADA', 'INVALIDADA') then
    raise exception 'Só dá para validar uma oferta já concluída.'
      using errcode = 'check_violation';
  end if;

  if p_data is null then
    raise exception 'Informe a data em que a validação aconteceu.'
      using errcode = 'check_violation';
  end if;

  -- Data retroativa é esperada — a equipe costuma julgar dias depois do teste.
  -- Data futura não: seria registrar algo que ainda não aconteceu.
  if p_data > current_date then
    raise exception 'A data da validação não pode ser no futuro.'
      using errcode = 'check_violation';
  end if;

  update ofertas
     set status               = case when p_validada then 'VALIDADA'::oferta_status
                                     else 'INVALIDADA'::oferta_status end,
         data_validacao       = p_data,
         observacao_validacao = nullif(trim(coalesce(p_observacao, '')), '')
   where id = p_oferta_id;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Desfaz o julgamento
--
-- Erra-se ao marcar, e o Painel fica errado junto. Voltar para CONCLUIDA é o
-- caminho — e o histórico guarda que houve ida e volta.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.desfazer_validacao(p_oferta_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_status oferta_status;
begin
  if not public.e_mestre_ou_chefe() then
    raise exception 'Apenas o Chefe e o Mestre da Esteira validam ofertas.'
      using errcode = 'insufficient_privilege';
  end if;

  select status into v_status from ofertas where id = p_oferta_id for update;

  if v_status not in ('VALIDADA', 'INVALIDADA') then
    raise exception 'Esta oferta não foi validada nem invalidada.'
      using errcode = 'check_violation';
  end if;

  -- A constraint ofertas_validacao_exige_data obriga os três campos a mudarem
  -- juntos: sem limpar a data, o status voltaria e o registro ficaria mentindo.
  update ofertas
     set status               = 'CONCLUIDA',
         data_validacao       = null,
         observacao_validacao = null
   where id = p_oferta_id;
end;
$$;

grant execute on function public.validar_oferta(uuid, boolean, date, text) to authenticated;
grant execute on function public.desfazer_validacao(uuid)                  to authenticated;
