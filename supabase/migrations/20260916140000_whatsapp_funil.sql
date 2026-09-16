-- Steera — o WhatsApp que leva ao funil da oferta
--
-- Guardado so com digitos e codigo do pais (padrao E.164, sem "+", sem
-- parenteses, sem traco). O numero e usado para montar link `wa.me`, e o
-- wa.me so aceita essa forma; formatar bonito e trabalho da tela.
--
-- Guardar como a pessoa digitou pareceria mais gentil e seria pior: o mesmo
-- numero viraria "(11) 99999-9999", "11999999999" e "+55 11 99999 9999" no
-- banco, e nenhuma busca por numero funcionaria.

alter table ofertas add column whatsapp_funil text;

comment on column ofertas.whatsapp_funil is
  'WhatsApp que leva ao funil da oferta. So digitos, com codigo do pais (E.164 sem o +).';

alter table ofertas
  add constraint ofertas_whatsapp_funil_formato
  check (whatsapp_funil is null or whatsapp_funil ~ '^[0-9]{10,15}$');

-- ─────────────────────────────────────────────────────────────────────────────
-- Preencher depois que a oferta saiu da Peneira
--
-- O funil so existe depois da montagem, entao o numero quase nunca e conhecido
-- no dia do cadastro. Mas `ofertas_atualizacao` so libera a linha inteira para
-- Chefe e Mestre, e alargar aquela policy deixaria qualquer um mexer em nome,
-- descricao e status junto.
--
-- RLS nao tem como escopar por coluna, entao a saida e uma funcao que toca
-- apenas esta coluna. `security definer` porque ela precisa passar por cima da
-- policy — e por isso o guarda de `membro_ativo()` na primeira linha nao e
-- decoracao: e a unica barreira.
--
-- Qualquer membro ativo pode definir: quem monta o funil e quem sabe o numero,
-- e exigir Chefe criaria gargalo em dado operacional.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.definir_whatsapp_funil(
  p_oferta_id uuid,
  p_numero    text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limpo text;
begin
  if not public.membro_ativo() then
    raise exception 'Apenas membros ativos alteram o WhatsApp do funil.'
      using errcode = 'insufficient_privilege';
  end if;

  -- Aceita o que a pessoa colar; o banco decide a forma canonica.
  v_limpo := nullif(regexp_replace(coalesce(p_numero, ''), '[^0-9]', '', 'g'), '');

  if v_limpo is not null and v_limpo !~ '^[0-9]{10,15}$' then
    raise exception 'Numero de WhatsApp invalido: precisa de 10 a 15 digitos com o codigo do pais.'
      using errcode = 'check_violation';
  end if;

  update ofertas set whatsapp_funil = v_limpo where id = p_oferta_id;

  if not found then
    raise exception 'Oferta nao encontrada.' using errcode = 'check_violation';
  end if;
end;
$$;

revoke all on function public.definir_whatsapp_funil(uuid, text) from public;
grant execute on function public.definir_whatsapp_funil(uuid, text) to authenticated;
