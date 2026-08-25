-- ============================================================================
-- CorraAgora — remove policies antigas da tabela "eventos"
--
-- Depois de rodar 0001_aprovacao_eventos.sql, o painel do Supabase
-- (Database > Policies) mostrou que ainda existiam policies antigas
-- de antes desse projeto ter role de admin. Como o Postgres combina
-- com "OU" várias policies permissivas do mesmo comando, a policy
-- antiga de SELECT (que não filtra por status) deixava qualquer
-- visitante ver eventos pendentes/rejeitados mesmo com a policy
-- nova no lugar. Rode este script para remover as antigas.
-- ============================================================================

drop policy if exists "Leitura pública de eventos" on public.eventos;
drop policy if exists "Organizador cria eventos" on public.eventos;
drop policy if exists "Organizador atualiza seus eventos" on public.eventos;
drop policy if exists "Organizador exclui seus eventos" on public.eventos;
