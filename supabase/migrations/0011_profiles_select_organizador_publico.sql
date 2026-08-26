-- ============================================================================
-- CorraAgora — Libera leitura pública do perfil de quem organiza evento aprovado
--
-- Mesmo padrão do achado anterior (categorias): a página pública do
-- evento busca o nome do organizador em "profiles" (full_name, email)
-- pra mostrar na seção "Organização". A única policy de SELECT em
-- "profiles" é "id = auth.uid() or is_admin()" (migration 0001), que
-- nega qualquer leitura para visitante anônimo — por isso o nome
-- aparece como "Organizador não identificado" pra quem não está
-- logado.
--
-- Esta policy libera a leitura só do perfil de quem é organizador_id
-- de pelo menos um evento aprovado — não abre os perfis de todo
-- mundo, só de quem já tem evento público no site.
--
-- Rode no SQL Editor do projeto ymaybqujglfajllruqub.
-- ============================================================================

drop policy if exists "profiles_select_organizador_publico" on public.profiles;
create policy "profiles_select_organizador_publico"
    on public.profiles for select
    using (
        exists (
            select 1 from public.eventos
            where eventos.organizador_id = profiles.id
              and eventos.status = 'aprovado'
        )
    );
