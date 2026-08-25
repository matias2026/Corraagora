-- ============================================================================
-- CorraAgora — Corrige policy de inscricao que ainda checava status antigo
--
-- A policy "Visitante realiza inscrição" (INSERT em inscricoes) foi criada
-- antes do sistema de aprovacao e ainda exigia eventos.status = 'publicado'.
-- Desde a migration 0001, o status de evento aprovado passou a ser
-- 'aprovado', entao toda inscricao estava sendo bloqueada pelo RLS.
-- ============================================================================

drop policy if exists "Visitante realiza inscrição" on public.inscricoes;

create policy "Visitante realiza inscrição"
    on public.inscricoes for insert
    to anon, authenticated
    with check (
        exists (
            select 1
            from public.eventos
            where eventos.id = inscricoes.evento_id
              and eventos.status = 'aprovado'
              and eventos.inscricoes_abertas = true
        )
    );
