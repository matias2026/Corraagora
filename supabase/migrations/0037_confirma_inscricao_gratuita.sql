-- ============================================================================
-- CorraAgora — Confirma automaticamente inscrição em evento/categoria gratuita
--
-- Achado: toda inscrição nova nasce "pendente" (migration 0001/api/inscricao.js)
-- e só o organizador confirma manualmente — decisão que fazia sentido quando
-- é preciso conferir comprovante de pagamento. Mas num evento gratuito não
-- existe comprovante nenhum pra conferir, então segurar como "pendente" só
-- gera trabalho manual pro organizador sem motivo.
--
-- Esta trigger confirma a inscrição sozinha (status = 'confirmado') quando
-- o preço REAL da categoria (lote vigente, se houver, senão o valor da
-- própria categoria) é zero. De propósito NÃO usa o "valor_pago" que vem no
-- corpo da requisição do app — esse campo é preenchido pelo navegador de
-- quem se inscreve e não é confiável; usar ele deixaria qualquer pessoa se
-- autoconfirmar de graça num evento pago só mandando valor_pago = 0.
--
-- Inscrição com desconto de cupom de 100% continua nascendo "pendente" —
-- o preço "real" da categoria continua sendo maior que zero, só o cupom
-- zera o valor pago; o organizador confirma manualmente como já era.
--
-- Rode no SQL Editor do projeto ymaybqujglfajllruqub.
-- ============================================================================

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
            -- Mesma regra de "lote vigente" usada na página pública do
            -- evento (assets/js/evento.js): o primeiro lote (por ordem)
            -- que ainda não venceu; se todos já venceram, o último.
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
                new.status := 'confirmado';
            end if;
        end if;
    end if;

    return new;
end;
$$;

drop trigger if exists trg_confirmar_inscricao_gratuita on public.inscricoes;

create trigger trg_confirmar_inscricao_gratuita
    before insert on public.inscricoes
    for each row
    execute function public.confirmar_inscricao_gratuita();
