-- ============================================================================
-- CorraAgora — Corrige "new row violates row-level security policy" na
-- inscrição de eventos gratuitos
--
-- BUG DE PRODUÇÃO (migration 0037): a trigger que confirma sozinha a
-- inscrição gratuita era BEFORE INSERT e mudava o "status" pra
-- 'confirmado' antes da linha ser gravada. Isso quebrou a policy de
-- segurança da migration 0019, que só aceita INSERT com
-- status = 'pendente' (trava criada de propósito pra ninguém conseguir
-- se autoconfirmar sem pagar) — toda inscrição em evento gratuito
-- (ex.: Soul Fit + Yoga Beat) passou a falhar com "new row violates
-- row-level security policy for table 'inscricoes'".
--
-- Correção: a trigger agora roda AFTER INSERT. A linha entra normalmente
-- como 'pendente' (passa na policy de INSERT numa boa) e só depois, já
-- gravada, é promovida pra 'confirmado' com um UPDATE — que é uma
-- operação separada, não pega mais na trava de INSERT.
--
-- Testado com "set local role anon" (mesma role que o site usa pra
-- visitante anônimo): a inscrição de teste passou e já saiu confirmada,
-- sem violar nenhuma policy. Rode no SQL Editor do projeto
-- ymaybqujglfajllruqub.
-- ============================================================================

drop trigger if exists trg_confirmar_inscricao_gratuita on public.inscricoes;

create or replace function public.confirmar_inscricao_gratuita()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_categoria_id bigint;
    v_lote_id bigint;
    v_valor numeric;
begin
    if new.status = 'pendente' then
        select id into v_categoria_id
          from public.categorias
         where evento_id = new.evento_id
           and nome = new.categoria
         limit 1;

        if v_categoria_id is not null then
            select id into v_lote_id
              from public.lotes
             where evento_id = new.evento_id
               and data_limite >= current_date
             order by ordem asc
             limit 1;

            if v_lote_id is null then
                select id into v_lote_id
                  from public.lotes
                 where evento_id = new.evento_id
                 order by ordem desc
                 limit 1;
            end if;

            if v_lote_id is not null then
                select valor into v_valor
                  from public.categoria_precos
                 where categoria_id = v_categoria_id
                   and lote_id = v_lote_id;
            end if;

            if v_valor is null then
                select valor into v_valor
                  from public.categorias
                 where id = v_categoria_id;
            end if;

            if v_valor is not null and v_valor = 0 then
                update public.inscricoes
                   set status = 'confirmado'
                 where id = new.id;
            end if;
        end if;
    end if;

    return new;
end;
$$;

create trigger trg_confirmar_inscricao_gratuita
    after insert on public.inscricoes
    for each row
    execute function public.confirmar_inscricao_gratuita();
