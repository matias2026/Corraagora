-- ============================================================================
-- CorraAgora — Impede que conta de atleta crie evento direto pela API
--
-- Com a conta de atleta (migration 0021), apareceu uma brecha: a policy de
-- INSERT em "eventos" (migration 0001) só confere "organizador_id =
-- auth.uid()" — não confere se quem está logado É de fato organizador. As
-- telas do painel (organizador/*.html) já foram ajustadas pra barrar quem
-- não é organizador/admin, mas isso é só a tela: qualquer pessoa logada
-- (inclusive uma conta de atleta) ainda conseguiria chamar a API do
-- Supabase direto e inserir um evento de verdade, pulando a tela.
--
-- A correção soma a condição que faltava: só organizador ou admin.
-- Categorias, lotes, preços e galeria de fotos não precisam de ajuste
-- separado — as policies deles já exigem ser dono do evento
-- (organizador_id = auth.uid()), e sem conseguir criar o evento em primeiro
-- lugar, uma conta de atleta nunca tem um evento pra ser dona.
--
-- Rode no SQL Editor do projeto ymaybqujglfajllruqub.
-- ============================================================================

drop policy if exists "eventos_insert_proprio" on public.eventos;
create policy "eventos_insert_proprio"
    on public.eventos for insert
    to authenticated
    with check (
        organizador_id = auth.uid()
        and exists (
            select 1 from public.profiles
            where profiles.id = auth.uid()
              and profiles.role in ('organizador', 'admin')
        )
    );
