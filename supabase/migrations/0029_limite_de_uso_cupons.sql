-- ============================================================================
-- CorraAgora — Limite de uso configurável por cupom
--
-- Achado da auditoria: cupons não tinham nenhum controle de quantas vezes
-- podiam ser usados. Um código de 100% (inscrição grátis) vazado podia ser
-- reaproveitado infinitas vezes, sem nenhum limite.
--
-- Adiciona duas colunas: limite_usos (opcional — em branco/null continua
-- sendo ilimitado, igual hoje) e usos_atuais (contador, começa em 0). O
-- organizador define o limite pelo painel (assets/js/editar-evento.js).
--
-- A conferência e o incremento acontecem juntos, num único UPDATE dentro
-- do trigger que já calcula o valor da inscrição (migration 0024) — é
-- atômico por natureza do UPDATE do Postgres (trava a linha na hora de
-- conferir e incrementar), então duas inscrições concorrentes usando o
-- mesmo cupom no limite exato não conseguem passar do limite.
--
-- Rode no SQL Editor do projeto ymaybqujglfajllruqub.
-- ============================================================================

alter table public.cupons
    add column if not exists limite_usos int,
    add column if not exists usos_atuais int not null default 0;

alter table public.cupons drop constraint if exists cupons_limite_usos_positivo;
alter table public.cupons
    add constraint cupons_limite_usos_positivo check (limite_usos is null or limite_usos > 0);

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
    v_cupom_percentual int;
begin
    if new.categoria is null then
        new.valor_pago := 0;
        return new;
    end if;

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

    -- Cupom: só aplica se for ativo, do evento certo, e ainda tiver uso
    -- disponível (limite_usos nulo = ilimitado). O UPDATE confere e
    -- incrementa numa tacada só, travando a linha — evita que duas
    -- inscrições concorrentes estourem o limite juntas.
    if new.cupom_codigo is not null then
        update public.cupons
           set usos_atuais = usos_atuais + 1
         where evento_id = new.evento_id
           and codigo = new.cupom_codigo
           and ativo = true
           and (limite_usos is null or usos_atuais < limite_usos)
        returning percentual into v_cupom_percentual;

        if found then
            v_valor := round(v_valor * (1 - v_cupom_percentual / 100.0), 2);
        else
            new.cupom_codigo := null;
        end if;
    end if;

    new.valor_pago := coalesce(v_valor, 0);

    return new;
end;
$$;
