-- ============================================================================
-- CorraAgora — Persiste o estado da cronometragem (largadas e encerramento)
--
-- Até agora, o cronômetro geral, as baterias disparadas e o status
-- "encerrado" do evento viviam só na memória do navegador (variáveis
-- JavaScript). Um F5 na página, a aba travando, ou o aparelho hibernando
-- no meio da prova apagava tudo — era preciso dar a largada de novo pras
-- categorias que ainda não tinham chegado. Os resultados já gravados
-- (tabela "resultados") nunca se perdiam, só o cronômetro em si.
--
-- Esta migration grava o horário real de cada largada (e de cada
-- encerramento) no banco, pra a página recalcular o tempo decorrido a
-- partir do relógio salvo, e não de um contador que começa do zero toda
-- vez que a página carrega.
--
-- Rode no SQL Editor do projeto ymaybqujglfajllruqub.
-- ============================================================================

create table if not exists public.cronometragem_baterias (
    id bigint generated always as identity primary key,
    evento_id bigint not null references public.eventos(id) on delete cascade,
    categorias text[] not null,
    status text not null default 'ativa' check (status in ('ativa', 'encerrada')),
    horario_largada timestamptz not null default now(),
    horario_encerrada timestamptz,
    criado_por uuid references auth.users(id),
    created_at timestamptz not null default now()
);

alter table public.cronometragem_baterias enable row level security;

drop policy if exists "cronometragem_baterias_select_dono_ou_admin" on public.cronometragem_baterias;
create policy "cronometragem_baterias_select_dono_ou_admin"
    on public.cronometragem_baterias for select
    using (
        exists (
            select 1 from public.eventos
            where eventos.id = cronometragem_baterias.evento_id
              and (eventos.organizador_id = auth.uid() or public.is_admin())
        )
    );

drop policy if exists "cronometragem_baterias_insert_dono_ou_admin" on public.cronometragem_baterias;
create policy "cronometragem_baterias_insert_dono_ou_admin"
    on public.cronometragem_baterias for insert
    to authenticated
    with check (
        exists (
            select 1 from public.eventos
            where eventos.id = cronometragem_baterias.evento_id
              and (eventos.organizador_id = auth.uid() or public.is_admin())
        )
    );

drop policy if exists "cronometragem_baterias_update_dono_ou_admin" on public.cronometragem_baterias;
create policy "cronometragem_baterias_update_dono_ou_admin"
    on public.cronometragem_baterias for update
    to authenticated
    using (
        exists (
            select 1 from public.eventos
            where eventos.id = cronometragem_baterias.evento_id
              and (eventos.organizador_id = auth.uid() or public.is_admin())
        )
    );

-- "Encerrar Evento" trava largadas/chegadas novas mesmo pra categorias que
-- nunca tiveram bateria nenhuma — precisa de uma flag própria no evento,
-- não dá pra inferir isso só a partir das baterias já disparadas.
alter table public.eventos
    add column if not exists cronometragem_encerrada boolean not null default false,
    add column if not exists cronometragem_encerrada_em timestamptz;
