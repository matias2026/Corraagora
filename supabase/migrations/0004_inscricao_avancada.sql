-- ============================================================================
-- CorraAgora — Página do evento e inscrição avançada
--
-- Rode no SQL Editor do projeto ymaybqujglfajllruqub, como fez com as
-- migrations anteriores. Cobre a Fase A (campos simples) e a Fase B
-- (lotes de preço, galeria de fotos, consulta por CPF+e-mail).
-- ============================================================================


-- ============================================================================
-- FASE A
-- ============================================================================

-- 2) Localização (link do Google Maps)
alter table public.eventos
    add column if not exists localizacao_url text;

-- 4) Contato e Instagram do organizador (por evento)
alter table public.eventos
    add column if not exists organizador_contato text;

alter table public.eventos
    add column if not exists organizador_instagram text;

-- 5) Campos novos da inscrição
alter table public.inscricoes
    add column if not exists cpf text;

alter table public.inscricoes
    add column if not exists equipe text;

alter table public.inscricoes
    add column if not exists licenca_cbc text;

alter table public.inscricoes
    add column if not exists sexo text;

alter table public.inscricoes
    add column if not exists data_nascimento date;

-- 6) Percurso da categoria (ex.: "Pro", "Sport")
alter table public.categorias
    add column if not exists percurso text;


-- ============================================================================
-- FASE B
-- ============================================================================

-- 7) Lotes de preço (por evento) e preço por categoria x lote
create table if not exists public.lotes (
    id bigint generated always as identity primary key,
    evento_id bigint not null references public.eventos(id) on delete cascade,
    nome text not null,
    ordem int not null default 1,
    data_limite date not null
);

alter table public.lotes enable row level security;

drop policy if exists "lotes_select_publico_ou_dono_ou_admin" on public.lotes;
create policy "lotes_select_publico_ou_dono_ou_admin"
    on public.lotes for select
    using (
        exists (
            select 1 from public.eventos
            where eventos.id = lotes.evento_id
              and (
                  eventos.status = 'aprovado'
                  or eventos.organizador_id = auth.uid()
                  or public.is_admin()
              )
        )
    );

drop policy if exists "lotes_insert_dono" on public.lotes;
create policy "lotes_insert_dono"
    on public.lotes for insert
    to authenticated
    with check (
        exists (
            select 1 from public.eventos
            where eventos.id = lotes.evento_id
              and eventos.organizador_id = auth.uid()
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
              and eventos.organizador_id = auth.uid()
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
              and eventos.organizador_id = auth.uid()
        )
    );

create table if not exists public.categoria_precos (
    id bigint generated always as identity primary key,
    categoria_id bigint not null references public.categorias(id) on delete cascade,
    lote_id bigint not null references public.lotes(id) on delete cascade,
    valor numeric not null default 0,
    unique (categoria_id, lote_id)
);

alter table public.categoria_precos enable row level security;

drop policy if exists "categoria_precos_select_publico_ou_dono_ou_admin" on public.categoria_precos;
create policy "categoria_precos_select_publico_ou_dono_ou_admin"
    on public.categoria_precos for select
    using (
        exists (
            select 1
            from public.categorias
            join public.eventos on eventos.id = categorias.evento_id
            where categorias.id = categoria_precos.categoria_id
              and (
                  eventos.status = 'aprovado'
                  or eventos.organizador_id = auth.uid()
                  or public.is_admin()
              )
        )
    );

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
              and eventos.organizador_id = auth.uid()
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
              and eventos.organizador_id = auth.uid()
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
              and eventos.organizador_id = auth.uid()
        )
    );

-- 8) Consulta de inscrição por CPF + e-mail ("segunda via")
--
-- Não abrimos SELECT público em "inscricoes" (CPF é dado sensível — LGPD).
-- Esta função roda com privilégio elevado e só devolve a inscrição quando
-- o CPF e o e-mail informados batem exatamente com o evento indicado.
create or replace function public.consultar_inscricao(
    p_evento_id bigint,
    p_cpf text,
    p_email text
)
returns setof public.inscricoes
language sql
security definer
stable
set search_path = public
as $$
    select *
    from public.inscricoes
    where evento_id = p_evento_id
      and cpf = p_cpf
      and lower(email) = lower(p_email);
$$;

grant execute on function public.consultar_inscricao(bigint, text, text)
    to anon, authenticated;

-- 9) Galeria de fotos do evento (além do banner de capa em eventos.banner_url)
create table if not exists public.evento_banners (
    id bigint generated always as identity primary key,
    evento_id bigint not null references public.eventos(id) on delete cascade,
    url text not null,
    ordem int not null default 1
);

alter table public.evento_banners enable row level security;

drop policy if exists "evento_banners_select_publico_ou_dono_ou_admin" on public.evento_banners;
create policy "evento_banners_select_publico_ou_dono_ou_admin"
    on public.evento_banners for select
    using (
        exists (
            select 1 from public.eventos
            where eventos.id = evento_banners.evento_id
              and (
                  eventos.status = 'aprovado'
                  or eventos.organizador_id = auth.uid()
                  or public.is_admin()
              )
        )
    );

drop policy if exists "evento_banners_insert_dono" on public.evento_banners;
create policy "evento_banners_insert_dono"
    on public.evento_banners for insert
    to authenticated
    with check (
        exists (
            select 1 from public.eventos
            where eventos.id = evento_banners.evento_id
              and eventos.organizador_id = auth.uid()
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
              and eventos.organizador_id = auth.uid()
        )
    );
