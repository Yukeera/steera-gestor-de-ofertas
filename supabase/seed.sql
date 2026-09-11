-- Steera — dados iniciais da instalacao
-- Roteiro de Montagem padrao, configuracoes e feriados nacionais.

-- ─────────────────────────────────────────────────────────────────────────────
-- Roteiro de Montagem padrao (RF-03.3)
-- ─────────────────────────────────────────────────────────────────────────────

insert into roteiros (id, nome, descricao, e_padrao)
values (
  '00000000-0000-0000-0000-000000000001',
  'Oferta padrao',
  'Roteiro usado na maioria das ofertas: paginas, WhatsApp, criativos, funil e campanha de teste.',
  true
)
on conflict (id) do nothing;

insert into roteiro_etapas (id, roteiro_id, ordem, titulo) values
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001', 1, 'Criacao da pagina do Facebook'),
  ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000001', 2, 'Criacao da pagina do Instagram'),
  ('00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000001', 3, 'Designacao e vinculacao do numero de WhatsApp'),
  ('00000000-0000-0000-0000-000000000104', '00000000-0000-0000-0000-000000000001', 4, 'Verificar coexistencia'),
  ('00000000-0000-0000-0000-000000000105', '00000000-0000-0000-0000-000000000001', 5, 'Producao do trio de criativos para teste'),
  ('00000000-0000-0000-0000-000000000106', '00000000-0000-0000-0000-000000000001', 6, 'Geracao do funil'),
  ('00000000-0000-0000-0000-000000000107', '00000000-0000-0000-0000-000000000001', 7, 'Geracao e configuracao dos entregaveis no funil'),
  ('00000000-0000-0000-0000-000000000108', '00000000-0000-0000-0000-000000000001', 8, 'Subir campanha de testes')
on conflict (id) do nothing;

-- Funcoes sugeridas. A etapa 7 tem dois donos de proposito: o Garimpeiro gera
-- os entregaveis e o Engenheiro de Fluxos os configura no funil.
insert into roteiro_etapa_funcoes (roteiro_etapa_id, funcao) values
  ('00000000-0000-0000-0000-000000000101', 'GESTOR_TRAFEGO'),
  ('00000000-0000-0000-0000-000000000102', 'GESTOR_TRAFEGO'),
  ('00000000-0000-0000-0000-000000000103', 'ENGENHEIRO_FLUXOS'),
  ('00000000-0000-0000-0000-000000000104', 'ENGENHEIRO_FLUXOS'),
  ('00000000-0000-0000-0000-000000000105', 'GARIMPEIRO'),
  ('00000000-0000-0000-0000-000000000106', 'ENGENHEIRO_FLUXOS'),
  ('00000000-0000-0000-0000-000000000107', 'ENGENHEIRO_FLUXOS'),
  ('00000000-0000-0000-0000-000000000107', 'GARIMPEIRO'),
  ('00000000-0000-0000-0000-000000000108', 'GESTOR_TRAFEGO')
on conflict do nothing;

-- ─────────────────────────────────────────────────────────────────────────────
-- Configuracoes (RF-10.3)
-- ─────────────────────────────────────────────────────────────────────────────

insert into configuracoes (chave, valor) values
  ('dias_alerta_sem_validacao', '7'::jsonb),
  ('nome_empresa', '"Steera"'::jsonb)
on conflict (chave) do nothing;

-- ─────────────────────────────────────────────────────────────────────────────
-- Feriados nacionais (RN-02) — o Chefe ajusta em /configuracoes/feriados,
-- inclusive para incluir feriados municipais e recessos da empresa.
-- ─────────────────────────────────────────────────────────────────────────────

insert into feriados (data, descricao) values
  ('2026-10-12', 'Nossa Senhora Aparecida'),
  ('2026-11-02', 'Finados'),
  ('2026-11-15', 'Proclamacao da Republica'),
  ('2026-11-20', 'Consciencia Negra'),
  ('2026-12-25', 'Natal'),
  ('2027-01-01', 'Confraternizacao Universal'),
  ('2027-02-08', 'Carnaval'),
  ('2027-02-09', 'Carnaval'),
  ('2027-03-26', 'Sexta-feira Santa'),
  ('2027-04-21', 'Tiradentes'),
  ('2027-05-01', 'Dia do Trabalho'),
  ('2027-05-27', 'Corpus Christi'),
  ('2027-09-07', 'Independencia'),
  ('2027-10-12', 'Nossa Senhora Aparecida'),
  ('2027-11-02', 'Finados'),
  ('2027-11-15', 'Proclamacao da Republica'),
  ('2027-11-20', 'Consciencia Negra'),
  ('2027-12-25', 'Natal')
on conflict (data) do nothing;
