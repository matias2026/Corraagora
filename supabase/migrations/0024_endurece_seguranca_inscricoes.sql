-- ============================================================================
-- CorraAgora — Endurece "inscricoes" contra fraude de valor e status inválido
--
-- Achados da auditoria de segurança (categoria "Validação de Entrada"):
--
-- 1) valor_pago e cupom_codigo eram calculados só no cliente
--    (assets/js/inscricao.js) e inseridos como vieram. A policy de INSERT
--    (migration 0019) só trava status='pendente' — nada confere se
--    valor_pago bate com o preço real da categoria/lote/cupom. Uma chamada
--    direta na REST API podia inserir a categoria mais cara com
--    valor_pago=0, e se um organizador confirmasse sem conferir manualmente,
--    era inscrição de graça.
--
--    Corrige com um trigger BEFORE INSERT que recalcula valor_pago no
--    servidor a partir de categorias/lotes/categoria_precos/cupons,
--    ignorando completamente o valor enviado pelo cliente. Se a categoria
--    enviada não existir para o evento, rejeita o INSERT (em vez de aceitar
--    com valor 0, que criaria uma inscrição "fantasma" numa categoria
--    inválida). Se o cupom enviado não for um cupom ativo do evento, o
--    desconto é ignorado e cupom_codigo é limpo (não bloqueia a inscrição,
--    só não aplica desconto de um código inventado).
--
-- 2) inscricoes.status nunca teve CHECK constraint (diferente de
--    eventos.status e profiles.status_organizador, que já têm). A policy de
--    UPDATE (migration 0008) confere só se quem está atualizando é dono do
--    evento — não confere o valor novo de status. Combinado com telas que
--    interpolam `class="status-pill status-${status}"` sem escapar (ex.:
--    consulta-inscricao.js, página pública), um organizador mal-intencionado
--    podia gravar um status com caracteres que quebram HTML/atributo,
--    alcançando o navegador de um atleta. O CHECK fecha isso na origem.
--
-- Rode no SQL Editor do projeto ymaybqujglfajllruqub.
-- ============================================================================

-- 1) valor_pago sempre recalculado no servidor, nunca confiado do cliente
create or replace function public.calcular_valor_pago_inscricao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_categoria_id bigint;
    v_valor_base numeric;
    v_lote_id bigint;
    v_preco_lote numeric;
    v_valor numeric;
    v_cupom record;
begin
    -- Evento sem categorias cadastradas (inscrição gratuita/sem categoria).
    if new.categoria is null then
        new.valor_pago := 0;
        return new;
    end if;

    -- Categoria enviada precisa existir de fato para este evento.
    select id, valor
      into v_categoria_id, v_valor_base
      from public.categorias
     where evento_id = new.evento_id
       and nome = new.categoria
     order by id
     limit 1;

    if v_categoria_id is null then
        raise exception 'Categoria inválida para este evento.';
    end if;

    -- Lote vigente (data_limite ainda não passou), senão o último lote
    -- cadastrado — mesma regra usada em assets/js/evento.js.
    select id
      into v_lote_id
      from public.lotes
     where evento_id = new.evento_id
       and data_limite >= current_date
     order by ordem asc
     limit 1;

    if v_lote_id is null then
        select id
          into v_lote_id
          from public.lotes
         where evento_id = new.evento_id
         order by ordem desc
         limit 1;
    end if;

    v_valor := v_valor_base;

    if v_lote_id is not null then
        select valor
          into v_preco_lote
          from public.categoria_precos
         where categoria_id = v_categoria_id
           and lote_id = v_lote_id;

        if v_preco_lote is not null then
            v_valor := v_preco_lote;
        end if;
    end if;

    -- Cupom: só aplica se for um cupom ATIVO de verdade deste evento.
    if new.cupom_codigo is not null then
        select *
          into v_cupom
          from public.cupons
         where evento_id = new.evento_id
           and codigo = new.cupom_codigo
           and ativo = true;

        if found then
            v_valor := round(v_valor * (1 - v_cupom.percentual / 100.0), 2);
        else
            new.cupom_codigo := null;
        end if;
    end if;

    new.valor_pago := coalesce(v_valor, 0);

    return new;
end;
$$;

drop trigger if exists trg_calcular_valor_pago_inscricao on public.inscricoes;

create trigger trg_calcular_valor_pago_inscricao
    before insert on public.inscricoes
    for each row
    execute function public.calcular_valor_pago_inscricao();

-- 2) status só pode ser um dos três valores esperados pela aplicação
alter table public.inscricoes drop constraint if exists inscricoes_status_check;

alter table public.inscricoes
    add constraint inscricoes_status_check
    check (status in ('pendente', 'confirmado', 'cancelado'));
