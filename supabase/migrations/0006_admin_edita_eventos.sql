-- ============================================================================
-- CorraAgora — Admin ve e edita qualquer evento
--
-- O admin ja podia SELECT em eventos/lotes/categoria_precos/evento_banners
-- (migrations 0001/0004), mas as policies de INSERT/UPDATE/DELETE dessas
-- tabelas (e as de "categorias", que ja existiam antes deste projeto)
-- so liberavam o dono do evento. Como editar um evento reescreve lotes,
-- categorias e categoria_precos inteiros, o admin precisa dessas
-- permissoes tambem.
-- ============================================================================

-- 1) categorias: policies novas so pra admin, somadas as que ja existiam
--    (nao mexo nas policies originais do organizador).
drop policy if exists "categorias_admin_select" on public.categorias;
create policy "categorias_admin_select"
    on public.categorias for select
    to authenticated
    using (public.is_admin());

drop policy if exists "categorias_admin_insert" on public.categorias;
create policy "categorias_admin_insert"
    on public.categorias for insert
    to authenticated
    with check (public.is_admin());

drop policy if exists "categorias_admin_update" on public.categorias;
create policy "categorias_admin_update"
    on public.categorias for update
    to authenticated
    using (public.is_admin())
    with check (public.is_admin());

drop policy if exists "categorias_admin_delete" on public.categorias;
create policy "categorias_admin_delete"
    on public.categorias for delete
    to authenticated
    using (public.is_admin());

-- 2) lotes: adiciona "ou admin" nas policies de insert/update/delete.
drop policy if exists "lotes_insert_dono" on public.lotes;
create policy "lotes_insert_dono"
    on public.lotes for insert
    to authenticated
    with check (
        exists (
            select 1 from public.eventos
            where eventos.id = lotes.evento_id
              and (eventos.organizador_id = auth.uid() or public.is_admin())
        )
    );

drop policy if exists "lotes_update_dono" on public.lotes;
create policy "lotes_update_dono"
    on public.lotes for update
    to authenticated
    using (
        exists (
            select 1 from public.eventos
            where eventos.id = lotes.evento_id
              and (eventos.organizador_id = auth.uid() or public.is_admin())
        )
    );

drop policy if exists "lotes_delete_dono" on public.lotes;
create policy "lotes_delete_dono"
    on public.lotes for delete
    to authenticated
    using (
        exists (
            select 1 from public.eventos
            where eventos.id = lotes.evento_id
              and (eventos.organizador_id = auth.uid() or public.is_admin())
        )
    );

-- 3) categoria_precos: idem.
drop policy if exists "categoria_precos_insert_dono" on public.categoria_precos;
create policy "categoria_precos_insert_dono"
    on public.categoria_precos for insert
    to authenticated
    with check (
        exists (
            select 1
            from public.categorias
            join public.eventos on eventos.id = categorias.evento_id
            where categorias.id = categoria_precos.categoria_id
              and (eventos.organizador_id = auth.uid() or public.is_admin())
        )
    );

drop policy if exists "categoria_precos_update_dono" on public.categoria_precos;
create policy "categoria_precos_update_dono"
    on public.categoria_precos for update
    to authenticated
    using (
        exists (
            select 1
            from public.categorias
            join public.eventos on eventos.id = categorias.evento_id
            where categorias.id = categoria_precos.categoria_id
              and (eventos.organizador_id = auth.uid() or public.is_admin())
        )
    );

drop policy if exists "categoria_precos_delete_dono" on public.categoria_precos;
create policy "categoria_precos_delete_dono"
    on public.categoria_precos for delete
    to authenticated
    using (
        exists (
            select 1
            from public.categorias
            join public.eventos on eventos.id = categorias.evento_id
            where categorias.id = categoria_precos.categoria_id
              and (eventos.organizador_id = auth.uid() or public.is_admin())
        )
    );

-- 4) evento_banners: idem (edicao de evento tambem reescreve a galeria).
drop policy if exists "evento_banners_insert_dono" on public.evento_banners;
create policy "evento_banners_insert_dono"
    on public.evento_banners for insert
    to authenticated
    with check (
        exists (
            select 1 from public.eventos
            where eventos.id = evento_banners.evento_id
              and (eventos.organizador_id = auth.uid() or public.is_admin())
        )
    );

drop policy if exists "evento_banners_delete_dono" on public.evento_banners;
create policy "evento_banners_delete_dono"
    on public.evento_banners for delete
    to authenticated
    using (
        exists (
            select 1 from public.eventos
            where eventos.id = evento_banners.evento_id
              and (eventos.organizador_id = auth.uid() or public.is_admin())
        )
    );
