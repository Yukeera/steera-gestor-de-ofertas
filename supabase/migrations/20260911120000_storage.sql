-- Steera — Storage: buckets, limites e RLS
--
-- storage.objects tambem tem RLS. Bucket privado sem policy nao e "seguro":
-- e inutilizavel, porque ninguem consegue ler nem escrever.

-- ─────────────────────────────────────────────────────────────────────────────
-- Buckets
--
-- Declarados aqui para que uma instalacao nova nao dependa de alguem lembrar
-- de cria-los na mao no painel. O `do update` alinha os limites mesmo quando o
-- bucket ja existe.
-- ─────────────────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatares', 'avatares', false, 2097152,
   array['image/jpeg', 'image/png', 'image/webp']),
  ('ofertas', 'ofertas', false, 10485760,
   array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ─────────────────────────────────────────────────────────────────────────────
-- Renomeia as colunas que guardam caminho de Storage
--
-- Elas guardam o caminho dentro do bucket, nao uma URL: bucket privado exige
-- URL assinada, gerada na hora da leitura e com validade curta. Chamar de
-- `_url` convidava a jogar o valor direto num <img src>, que nao funcionaria.
--
-- `ofertas.url_referencia` continua `url` porque e URL de verdade: o anuncio
-- do concorrente, fora do nosso Storage.
-- ─────────────────────────────────────────────────────────────────────────────

alter table membros       rename column foto_url  to foto_path;
alter table ofertas       rename column capa_url  to capa_path;
alter table oferta_anexos rename column url       to caminho;
alter table tarefas       rename column anexo_url to anexo_path;

-- ─────────────────────────────────────────────────────────────────────────────
-- Policies: avatares
--
-- Convencao de caminho: avatares/<membro_id>/<arquivo>
-- O primeiro nivel de pasta e o dono da foto, e e isso que as policies checam.
-- ─────────────────────────────────────────────────────────────────────────────

create policy avatares_leitura on storage.objects
  for select using (
    bucket_id = 'avatares' and public.membro_ativo()
  );

-- RF-01.5: cada um troca a propria foto; o Chefe troca a de qualquer um.
create policy avatares_insercao on storage.objects
  for insert with check (
    bucket_id = 'avatares'
    and (public.e_chefe() or (storage.foldername(name))[1] = auth.uid()::text)
  );

create policy avatares_atualizacao on storage.objects
  for update using (
    bucket_id = 'avatares'
    and (public.e_chefe() or (storage.foldername(name))[1] = auth.uid()::text)
  );

create policy avatares_remocao on storage.objects
  for delete using (
    bucket_id = 'avatares'
    and (public.e_chefe() or (storage.foldername(name))[1] = auth.uid()::text)
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- Policies: ofertas
--
-- Convencao de caminho: ofertas/<oferta_id>/<arquivo>
-- Qualquer membro ativo envia criativo, porque qualquer um cadastra ideia na
-- Peneira. Apagar e so de Chefe e Mestre.
-- ─────────────────────────────────────────────────────────────────────────────

create policy ofertas_arquivos_leitura on storage.objects
  for select using (
    bucket_id = 'ofertas' and public.membro_ativo()
  );

create policy ofertas_arquivos_insercao on storage.objects
  for insert with check (
    bucket_id = 'ofertas' and public.membro_ativo()
  );

create policy ofertas_arquivos_atualizacao on storage.objects
  for update using (
    bucket_id = 'ofertas' and public.e_mestre_ou_chefe()
  );

create policy ofertas_arquivos_remocao on storage.objects
  for delete using (
    bucket_id = 'ofertas' and public.e_mestre_ou_chefe()
  );
