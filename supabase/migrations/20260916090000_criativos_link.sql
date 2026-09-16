-- Steera — criativos de referencia passam a ser links
--
-- O criativo que inspira uma ideia mora na biblioteca de anuncios, em video.
-- Baixar um frame e reenviar como imagem perde o que importa — o video, o
-- anunciante, quanto tempo esta no ar — e envelhece: o anuncio muda, a copia
-- local nao.
--
-- Entao `oferta_anexos` passa a aceitar link externo, alem de arquivo no
-- Storage. As duas colunas convivem porque sao coisas diferentes: `caminho` e
-- posicao dentro de um bucket privado, que so vira endereco depois de assinada;
-- `url` ja e um endereco publico. Confundir as duas foi o motivo de `url` ter
-- virado `caminho` la no comeco — agora existe de novo, com o sentido certo.

alter table oferta_anexos
  add column url text,
  alter column caminho drop not null;

-- Uma linha e um arquivo OU um link. Nunca os dois, nunca nenhum.
alter table oferta_anexos
  add constraint oferta_anexos_arquivo_ou_link
  check ((caminho is null) <> (url is null));

comment on column oferta_anexos.caminho is
  'Caminho dentro do bucket `ofertas`. Nulo quando a linha e um link externo.';
comment on column oferta_anexos.url is
  'Endereco externo, tipicamente da biblioteca de anuncios. Nulo quando a linha e um arquivo.';

-- ─────────────────────────────────────────────────────────────────────────────
-- Remocao: antes so Chefe e Mestre da Esteira.
--
-- Isso fazia sentido quando anexo era upload, feito uma vez. Agora o autor
-- monta a lista de links na tela de edicao, e lista onde so da para adicionar
-- acumula link errado para sempre.
--
-- A regra passa a ser a mesma de `ofertas_atualizacao`: o autor manda na
-- propria ideia enquanto ela esta na Peneira; depois disso, so Chefe e Mestre.
-- ─────────────────────────────────────────────────────────────────────────────

drop policy oferta_anexos_remocao on oferta_anexos;

create policy oferta_anexos_remocao on oferta_anexos
  for delete using (
    public.e_mestre_ou_chefe()
    or (
      enviado_por = auth.uid()
      and exists (
        select 1
        from ofertas o
        where o.id = oferta_anexos.oferta_id
          and o.status = 'NA_PENEIRA'
      )
    )
  );
