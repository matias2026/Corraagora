-- ============================================================================
-- CorraAgora — Cupons de desconto por evento
--
-- Cada evento pode ter até 6 cupons (10%, 15%, 20%, 25%, 30% e 100% —
-- inscrição gratuita), cada um com um código gerado a partir do nome
-- do evento (ex.: "mtbtestecorraagora10" para 10%). Só o organizador
-- dono do evento (ou o admin) pode ativar/desativar um cupom. O
-- atleta usa o código na hora de se inscrever, e o valor já sai
-- descontado.
--
-- Rode no SQL Editor do projeto ymaybqujglfajllruqub.
-- ============================================================================

create table if not exists public.cupons (
    id bigint generated always as identity primary key,
    evento_id bigint not null references public.eventos(id) on delete cascade,
    percentual int not null check (percentual in (10, 15, 20, 25, 30, 100)),
    codigo text not null unique,
    ativo boolean not null default true,
    created_at timestamptz not null default now(),
    unique (evento_id, percentual)
);

alter table public.cupons enable row level security;

-- Leitura: publico ve so cupons ATIVOS de eventos aprovados (pra
-- validar o codigo digitado na inscricao). Dono e admin veem todos
-- os cupons do proprio evento, ativos ou nao.
drop policy if exists "cupons_select_publico_ou_dono_ou_admin" on public.cupons;
create policy "cupons_select_publico_ou_dono_ou_admin"
    on public.cupons for select
    using (
        exists (
            select 1 from public.eventos
            where eventos.id = cupons.evento_id
              and (
                  (eventos.status = 'aprovado' and cupons.ativo = true)
                  or eventos.organizador_id = auth.uid()
                  or public.is_admin()
              )
        )
    );

-- Criacao e alteracao: so o dono do evento (ou admin).
drop policy if exists "cupons_insert_dono_ou_admin" on public.cupons;
create policy "cupons_insert_dono_ou_admin"
    on public.cupons for insert
    to authenticated
    with check (
        exists (
            select 1 from public.eventos
            where eventos.id = cupons.evento_id
              and (eventos.organizador_id = auth.uid() or public.is_admin())
        )
    );

drop policy if exists "cupons_update_dono_ou_admin" on public.cupons;
create policy "cupons_update_dono_ou_admin"
    on public.cupons for update
    to authenticated
    using (
        exists (
            select 1 from public.eventos
            where eventos.id = cupons.evento_id
              and (eventos.organizador_id = auth.uid() or public.is_admin())
        )
    )
    with check (
        exists (
            select 1 from public.eventos
            where eventos.id = cupons.evento_id
              and (eventos.organizador_id = auth.uid() or public.is_admin())
        )
    );

-- Guarda qual cupom (se algum) foi usado em cada inscricao, pro
-- organizador acompanhar.
alter table public.inscricoes
    add column if not exists cupom_codigo text;
