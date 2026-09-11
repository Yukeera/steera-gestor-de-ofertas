-- Steera — criacao do primeiro Chefe
--
-- NAO e uma migration. Rode isto UMA VEZ, manualmente, no SQL Editor do
-- Supabase, depois de criar o primeiro usuario em Authentication > Users.
--
-- Nao virou funcao de banco de proposito: uma funcao capaz de promover
-- qualquer um a CHEFE seria um caminho de escalada de privilegio se algum dia
-- ficasse exposta ao papel `authenticated`.
--
-- Troque os dois valores abaixo antes de executar.

do $$
declare
  v_email text := 'troque@pelo-seu-email.com';
  v_nome  text := 'Troque pelo seu nome';
  v_id    uuid;
begin
  select id into v_id from auth.users where email = v_email;

  if v_id is null then
    raise exception
      'Nenhum usuario com o e-mail %. Crie em Authentication > Users primeiro.',
      v_email;
  end if;

  insert into membros (id, nome, email, cargo, ativo)
  values (v_id, v_nome, v_email, 'CHEFE', true)
  on conflict (id) do update
    set cargo = 'CHEFE',
        ativo = true,
        nome  = excluded.nome;

  -- O Chefe tambem opera a esteira no comeco.
  insert into membro_funcoes (membro_id, funcao)
  values (v_id, 'MESTRE_ESTEIRA')
  on conflict do nothing;

  raise notice 'Chefe criado: % (%)', v_nome, v_email;
end;
$$;
