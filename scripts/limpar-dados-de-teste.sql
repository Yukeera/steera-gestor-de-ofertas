-- Steera — zera os dados de operação, preserva a equipe
--
-- NÃO É UMA MIGRATION, e não deve virar uma: migration roda sozinha em todo
-- `db:push` e em todo ambiente novo. Um apagão de dados no meio delas
-- destruiria dados reais no dia em que alguém rodasse o push.
--
-- Rode à mão, uma vez, no SQL Editor do Supabase.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- O QUE SOBREVIVE
--
--   membros, membro_funcoes   a equipe e os cargos
--   auth.users                os logins (nada aqui encosta neles)
--   roteiros e etapas         o Roteiro padrão é configuração, não dado de uso
--   feriados, configuracoes   configuração
--
-- O QUE SOME
--
--   ofertas + etapas, responsáveis, anexos e histórico
--   rodadas
--   tarefas + responsáveis
--   notificações
--
-- ─────────────────────────────────────────────────────────────────────────────
-- POR QUE TRUNCATE E NÃO DELETE
--
-- `delete` dispara os triggers linha a linha, e dois deles atrapalham aqui:
--
--   trg_registra_evento_delegacao  ao apagar um responsável de etapa, tenta
--                                  gravar em oferta_eventos apontando para a
--                                  oferta que está sendo apagada — violação
--                                  de chave estrangeira no meio da limpeza.
--   trg_sincroniza_status_oferta   recalcula o status de uma oferta que já
--                                  está indo embora.
--
-- `truncate` não dispara trigger de linha. Também é instantâneo.
--
-- A lista abaixo é explícita e SEM `cascade` de propósito: se alguma tabela
-- que referencia estas ficar de fora, o Postgres recusa e diz qual é, em vez
-- de apagar em silêncio algo que não estava no plano.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

truncate table
  oferta_eventos,
  oferta_anexos,
  oferta_etapa_responsaveis,
  oferta_etapas,
  tarefa_responsaveis,
  tarefas,
  ofertas,
  rodadas,
  notificacoes;

-- Confere antes de confirmar. Tudo zero na primeira lista, equipe intacta na
-- segunda. Se não estiver, `rollback;` em vez de `commit;`.
select 'ofertas' as tabela, count(*) from ofertas
union all select 'oferta_etapas',  count(*) from oferta_etapas
union all select 'rodadas',        count(*) from rodadas
union all select 'tarefas',        count(*) from tarefas
union all select 'notificacoes',   count(*) from notificacoes
union all select '— membros —',    count(*) from membros
union all select '— roteiros —',   count(*) from roteiros
union all select '— feriados —',   count(*) from feriados;

commit;

-- ─────────────────────────────────────────────────────────────────────────────
-- OPCIONAIS — descomente só se os seus também forem de teste
--
-- Roteiros: se você criou roteiros de teste além do padrão, apague só eles
-- pelo nome, em vez de truncar a tabela toda.
--
--   delete from roteiros where nome ilike '%teste%';
--
-- Feriados:
--
--   truncate table feriados;
--
-- Configurações:
--
--   truncate table configuracoes;
-- ─────────────────────────────────────────────────────────────────────────────
