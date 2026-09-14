-- Steera — remanejamento de oferta no calendário (RF-05.4)
--
-- Arrastar um card para outro dia parece trivial, mas tem três regras:
-- o destino precisa ser dia útil, a oferta precisa estar na esteira, e o dia
-- pode já estar ocupado. A troca de lugar entre duas ofertas é o caso que
-- mais justifica a transação: são dois UPDATEs que só fazem sentido juntos.

create or replace function public.remanejar_oferta(
  p_oferta_id uuid,
  p_nova_data date,
  p_trocar    boolean default false
)
returns date
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_status      oferta_status;
  v_data_atual  date;
  v_ocupante    uuid;
  v_nome_ocupante text;
begin
  if not public.e_mestre_ou_chefe() then
    raise exception 'Apenas o Chefe e o Mestre da Esteira remanejam ofertas.'
      using errcode = 'insufficient_privilege';
  end if;

  select status, data_prevista into v_status, v_data_atual
    from ofertas where id = p_oferta_id for update;

  if v_status is null then
    raise exception 'Oferta não encontrada.' using errcode = 'check_violation';
  end if;

  -- Oferta já concluída ou julgada tem data que é registro histórico, não
  -- agenda: mexer nela reescreveria quando o trabalho aconteceu.
  if v_status <> 'NA_ESTEIRA' then
    raise exception 'Só dá para remanejar oferta que ainda está na esteira.'
      using errcode = 'check_violation';
  end if;

  if p_nova_data = v_data_atual then
    return v_data_atual;
  end if;

  -- RN-02 vale também aqui: nada de agendar oferta para sábado ou feriado.
  if public.proximo_dia_util(p_nova_data) <> p_nova_data then
    raise exception 'A equipe não monta oferta em fim de semana nem feriado.'
      using errcode = 'check_violation';
  end if;

  select id, nome into v_ocupante, v_nome_ocupante
    from ofertas
   where data_prevista = p_nova_data
     and status = 'NA_ESTEIRA'
     and id <> p_oferta_id
   limit 1
   for update;

  if v_ocupante is not null and not p_trocar then
    raise exception 'O dia % já tem a oferta "%".', p_nova_data, v_nome_ocupante
      using errcode = 'check_violation';
  end if;

  -- Troca: a outra oferta vai para o dia que esta acabou de deixar. Sem a
  -- transação, um dos dois UPDATEs poderia ficar sozinho e deixar as duas
  -- ofertas no mesmo dia — ou nenhuma em lugar nenhum.
  if v_ocupante is not null then
    update ofertas set data_prevista = v_data_atual where id = v_ocupante;
  end if;

  update ofertas set data_prevista = p_nova_data where id = p_oferta_id;

  return p_nova_data;
end;
$$;

grant execute on function public.remanejar_oferta(uuid, date, boolean) to authenticated;
