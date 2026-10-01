-- ============================================================================
-- CorraAgora — Numeração automática de peito + tabela de resultados
--
-- Antes de hoje, o painel de cronometragem tentava buscar inscrição por
-- "número de peito", mas essa coluna nunca existiu — a busca falhava
-- sempre. Esta migration adiciona:
--
--   1) Numeração automática por categoria: o organizador define uma faixa
--      inicial (ex.: Elite começa em 1, Master em 21) em "numero_inicial";
--      cada inscrição nova naquela categoria recebe o próximo número livre
--      automaticamente.
--
--   2) Uma tabela "resultados" de verdade — até agora, registrar uma
--      chegada só atualizava a tela; nada era salvo no banco.
--
-- Detalhe importante de design: NÃO guardamos um contador mutável na
-- própria linha da categoria (tipo "próximo número"), porque
-- assets/js/editar-evento.js APAGA e RECRIA todas as categorias do evento
-- a cada vez que o organizador salva uma edição — um contador ali
-- resetaria sozinho e poderia repetir um número já usado. Em vez disso,
-- o próximo número é sempre calculado a partir do maior "numero" já
-- gravado em "inscricoes" pra aquela categoria — uma informação que
-- nunca é apagada.
--
-- Rode no SQL Editor do projeto ymaybqujglfajllruqub.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Numeração automática de peito
-- ----------------------------------------------------------------------------

alter table public.categorias
    add column if not exists numero_inicial int;

alter table public.categorias drop constraint if exists categorias_numero_inicial_positivo;
alter table public.categorias
    add constraint categorias_numero_inicial_positivo
    check (numero_inicial is null or numero_inicial > 0);

alter table public.inscricoes
    add column if not exists numero int;

alter table public.inscricoes drop constraint if exists inscricoes_numero_unico_por_evento;
alter table public.inscricoes
    add constraint inscricoes_numero_unico_por_evento
    unique (evento_id, numero);
-- (unique no Postgres permite múltiplas linhas com "numero" nulo — só
-- barra duplicidade quando o número está de fato preenchido)

create or replace function public.atribuir_numero_peito()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_categoria_id bigint;
    v_numero_inicial int;
    v_numero_atribuido int;
begin
    if new.categoria is null then
        new.numero := null;
        return new;
    end if;

    -- "for update" trava a linha da categoria até o fim desta transação —
    -- garante que duas inscrições concorrentes na mesma categoria não
    -- calculem o mesmo "próximo número" ao mesmo tempo.
    select id, numero_inicial
      into v_categoria_id, v_numero_inicial
      from public.categorias
     where evento_id = new.evento_id
       and nome = new.categoria
     order by id
     limit 1
     for update;

    if v_categoria_id is null or v_numero_inicial is null then
        -- Categoria não encontrada, ou organizador não configurou uma
        -- faixa de numeração pra ela — inscrição segue sem número.
        new.numero := null;
        return new;
    end if;

    select coalesce(max(numero), v_numero_inicial - 1) + 1
      into v_numero_atribuido
      from public.inscricoes
     where evento_id = new.evento_id
       and categoria = new.categoria;

    new.numero := v_numero_atribuido;

    return new;
end;
$$;

drop trigger if exists trg_atribuir_numero_peito on public.inscricoes;

create trigger trg_atribuir_numero_peito
    before insert on public.inscricoes
    for each row
    execute function public.atribuir_numero_peito();

-- ----------------------------------------------------------------------------
-- 2) Tabela de resultados
-- ----------------------------------------------------------------------------

create table if not exists public.resultados (
    id bigint generated always as identity primary key,
    inscricao_id bigint not null references public.inscricoes(id) on delete cascade,
    evento_id bigint not null references public.eventos(id) on delete cascade,
    horario_chegada timestamptz not null default now(),
    tempo_liquido_segundos int not null check (tempo_liquido_segundos >= 0),
    registrado_por uuid references auth.users(id),
    created_at timestamptz not null default now(),
    unique (inscricao_id)
);

alter table public.resultados enable row level security;

drop policy if exists "resultados_select_dono_ou_admin" on public.resultados;
create policy "resultados_select_dono_ou_admin"
    on public.resultados for select
    using (
        exists (
            select 1 from public.eventos
            where eventos.id = resultados.evento_id
              and (eventos.organizador_id = auth.uid() or public.is_admin())
        )
    );

drop policy if exists "resultados_insert_dono_ou_admin" on public.resultados;
create policy "resultados_insert_dono_ou_admin"
    on public.resultados for insert
    to authenticated
    with check (
        exists (
            select 1 from public.eventos
            where eventos.id = resultados.evento_id
              and (eventos.organizador_id = auth.uid() or public.is_admin())
        )
    );

drop policy if exists "resultados_update_dono_ou_admin" on public.resultados;
create policy "resultados_update_dono_ou_admin"
    on public.resultados for update
    to authenticated
    using (
        exists (
            select 1 from public.eventos
            where eventos.id = resultados.evento_id
              and (eventos.organizador_id = auth.uid() or public.is_admin())
        )
    );

drop policy if exists "resultados_delete_dono_ou_admin" on public.resultados;
create policy "resultados_delete_dono_ou_admin"
    on public.resultados for delete
    to authenticated
    using (
        exists (
            select 1 from public.eventos
            where eventos.id = resultados.evento_id
              and (eventos.organizador_id = auth.uid() or public.is_admin())
        )
    );

-- View pública "segura" — mesmo padrão de "organizadores_publicos":
-- expõe só o que é aceitável mostrar pro público (número, nome, categoria,
-- tempo), nunca CPF/e-mail/telefone que moram em "inscricoes".
create or replace view public.resultados_publicos as
select
    r.evento_id,
    i.numero,
    i.nome,
    i.categoria,
    r.tempo_liquido_segundos,
    r.horario_chegada
from public.resultados r
join public.inscricoes i on i.id = r.inscricao_id;

grant select on public.resultados_publicos to anon, authenticated;
