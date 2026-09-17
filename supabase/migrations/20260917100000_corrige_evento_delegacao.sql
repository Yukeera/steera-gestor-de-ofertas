-- Steera — corrige o cancelamento de Rodada
--
-- Sintoma: cancelar uma Rodada estourava
--   null value in column "oferta_id" of relation "oferta_eventos"
--
-- Causa: `fn_registra_evento_delegacao` descobre a que oferta o evento
-- pertence lendo `oferta_etapas`. Isso funciona quando alguem e liberado de
-- uma etapa que continua existindo, que era o caso previsto.
--
-- Mas `cancelar_rodada` chama `remover_oferta_rodada`, que apaga as
-- `oferta_etapas` inteiras. O `on delete cascade` do Postgres apaga o pai
-- PRIMEIRO e so depois os filhos, entao quando este trigger roda a etapa ja
-- nao existe: o select volta vazio, `v_oferta_id` fica nulo, e o insert bate
-- no not null.
--
-- Nao era so o cancelamento. Qualquer caminho que apague etapas com
-- responsavel caia no mesmo lugar — devolver UMA oferta para a Peneira, e
-- apagar uma oferta inteira (que cascateia ate aqui). Como `instanciar_roteiro`
-- ja nasce preenchendo responsaveis SUGERIDOS, praticamente toda oferta
-- escalada estava presa.
--
-- Correcao: quando a etapa nao existe mais, nao ha evento a registrar. Sair
-- delegado de uma etapa e um fato do historico; a etapa deixar de existir nao
-- e — e o proprio historico da oferta some junto quando a oferta e apagada.
-- A mudanca de status para NA_PENEIRA continua sendo registrada pelo
-- `fn_registra_evento_oferta`, que e o evento que de fato importa ali.

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

  -- A etapa foi embora junto (cascata). Nada a registrar, e insistir
  -- gravaria um evento sem dono.
  if v_oferta_id is null then
    return null;
  end if;

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
