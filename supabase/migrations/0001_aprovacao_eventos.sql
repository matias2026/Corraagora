-- ============================================================================
-- CorraAgora — Sistema de aprovação de eventos
--
-- COMO RODAR:
--   1. Abra o painel do Supabase do projeto (ymaybqujglfajllruqub).
--   2. Vá em "SQL Editor" > "New query".
--   3. Cole o conteúdo deste arquivo inteiro e clique em "Run".
--   4. Depois de rodar, vá em "Authentication" > "Policies" (ou
--      "Database" > "Policies") e confira que não sobrou nenhuma
--      policy antiga e mais permissiva nas tabelas "eventos" e
--      "profiles" (ex.: "Enable read access for all users"). Se
--      houver, apague-a — senão ela continua liberando acesso
--      mesmo com as regras novas criadas aqui.
--
-- Este script é seguro para rodar mais de uma vez (idempotente):
-- ele sempre remove a versão anterior de cada policy/trigger antes
-- de recriar.
-- ============================================================================


-- ============================================================================
-- 1) PERFIS DE USUÁRIO (role)
-- ============================================================================

create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    email text,
    full_name text,
    role text not null default 'organizador' check (role in ('organizador', 'admin')),
    created_at timestamptz not null default now()
);

-- Função auxiliar: verifica se o usuário logado é admin.
-- security definer = ela mesma ignora RLS ao consultar "profiles",
-- evitando o problema de a policy de "profiles" depender dela mesma.
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
    select exists (
        select 1 from public.profiles
        where id = auth.uid() and role = 'admin'
    );
$$;

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
    on public.profiles for select
    to authenticated
    using (id = auth.uid() or public.is_admin());

-- De propósito: nenhuma policy de INSERT/UPDATE/DELETE é criada
-- para "profiles". Sem policy, o Postgres nega por padrão — ou
-- seja, ninguém consegue criar seu próprio perfil como admin nem
-- alterar sua própria role pelo site. A única forma de existir um
-- perfil é o trigger abaixo (que roda com privilégio elevado), e a
-- única forma de virar admin é um UPDATE feito por você direto
-- aqui no SQL Editor (passo 5).


-- ============================================================================
-- 2) Cria o perfil automaticamente a cada novo cadastro (sempre "organizador")
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.profiles (id, email, full_name, role)
    values (
        new.id,
        new.email,
        new.raw_user_meta_data ->> 'full_name',
        'organizador'  -- fixo: o valor enviado pelo formulário de cadastro é ignorado
    )
    on conflict (id) do nothing;

    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- Backfill: cria perfil para contas que já existiam antes deste script.
insert into public.profiles (id, email, full_name, role)
select id, email, raw_user_meta_data ->> 'full_name', 'organizador'
from auth.users
on conflict (id) do nothing;


-- ============================================================================
-- 3) Promove sua conta para administrador
-- ============================================================================

update public.profiles
set role = 'admin'
where email = 'erikimatias14@gmail.com';


-- ============================================================================
-- 4) Limpeza dos eventos de teste já cadastrados (inclui o "MTB 30/03/1996")
-- ============================================================================

do $$
begin
    if to_regclass('public.inscricoes') is not null then
        execute 'delete from public.inscricoes where evento_id in (select id from public.eventos)';
    end if;
end $$;

delete from public.categorias
where evento_id in (select id from public.eventos);

delete from public.eventos;


-- ============================================================================
-- 5) Coluna "status" dos eventos: pendente / aprovado / rejeitado
-- ============================================================================

alter table public.eventos alter column status set default 'pendente';

alter table public.eventos drop constraint if exists eventos_status_check;
alter table public.eventos
    add constraint eventos_status_check
    check (status in ('pendente', 'aprovado', 'rejeitado'));

-- Trava no banco: só admin pode definir/alterar o status de um evento.
-- Isso vale mesmo que alguém chame a API do Supabase direto (sem
-- passar pelo site), então não depende de esconder botão no front-end.
create or replace function public.proteger_status_evento()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if tg_op = 'INSERT' then
        if not public.is_admin() then
            new.status := 'pendente';
        end if;
        return new;
    end if;

    if tg_op = 'UPDATE' then
        if new.status is distinct from old.status and not public.is_admin() then
            new.status := old.status;
        end if;
        return new;
    end if;

    return new;
end;
$$;

drop trigger if exists trg_proteger_status_evento on public.eventos;
create trigger trg_proteger_status_evento
    before insert or update on public.eventos
    for each row execute function public.proteger_status_evento();


-- ============================================================================
-- 6) RLS da tabela "eventos"
-- ============================================================================

alter table public.eventos enable row level security;

-- Leitura: público vê só "aprovado"; o dono e o admin veem tudo.
drop policy if exists "eventos_select_publico_ou_dono_ou_admin" on public.eventos;
create policy "eventos_select_publico_ou_dono_ou_admin"
    on public.eventos for select
    using (
        status = 'aprovado'
        or organizador_id = auth.uid()
        or public.is_admin()
    );

-- Criação: um usuário logado só pode criar evento em nome dele mesmo.
drop policy if exists "eventos_insert_proprio" on public.eventos;
create policy "eventos_insert_proprio"
    on public.eventos for insert
    to authenticated
    with check (organizador_id = auth.uid());

-- Edição: o dono do evento ou o admin.
-- (a trava de status em si fica por conta do trigger acima)
drop policy if exists "eventos_update_dono_ou_admin" on public.eventos;
create policy "eventos_update_dono_ou_admin"
    on public.eventos for update
    to authenticated
    using (organizador_id = auth.uid() or public.is_admin())
    with check (organizador_id = auth.uid() or public.is_admin());

-- Exclusão: o dono do evento ou o admin.
drop policy if exists "eventos_delete_dono_ou_admin" on public.eventos;
create policy "eventos_delete_dono_ou_admin"
    on public.eventos for delete
    to authenticated
    using (organizador_id = auth.uid() or public.is_admin());


-- ============================================================================
-- Fim. Não esqueça de conferir a seção "COMO RODAR", passo 4, no
-- topo deste arquivo.
-- ============================================================================
