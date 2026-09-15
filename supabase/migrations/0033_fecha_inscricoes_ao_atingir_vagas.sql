-- ============================================================================
-- CorraAgora — Fecha inscrições automaticamente ao atingir o limite de vagas
--
-- Antes (migration 0030): decisão do organizador era só avisar "vagas
-- esgotadas" na página pública, sem travar novas inscrições — ele preferia
-- decidir manualmente quem confirmar. Essa decisão mudou: agora a
-- inscrição nova é recusada assim que o total de pendentes + confirmados
-- atingir o número de vagas do evento, e o evento é fechado
-- (inscricoes_abertas = false) automaticamente nesse momento.
--
-- Continua contando "pendente" + "confirmado", igual à função
-- contar_inscritos_evento (migration 0030), e vagas nulo ou <= 0 continua
-- significando "sem limite", igual à trava de confirmação (migration 0032).
--
-- Rode no SQL Editor do projeto ymaybqujglfajllruqub.
-- ============================================================================

create or replace function public.impedir_inscricao_acima_das_vagas()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_vagas int;
    v_total int;
begin
    select vagas into v_vagas
      from public.eventos
     where id = new.evento_id;

    if v_vagas is not null and v_vagas > 0 then
        select count(*) into v_total
          from public.inscricoes
         where evento_id = new.evento_id
           and status in ('pendente', 'confirmado');

        if v_total >= v_vagas then
            raise exception
                'As inscrições para este evento foram encerradas — limite de % vaga(s) atingido.', v_vagas;
        end if;
    end if;

    return new;
end;
$$;

drop trigger if exists trg_impedir_inscricao_acima_das_vagas on public.inscricoes;

create trigger trg_impedir_inscricao_acima_das_vagas
    before insert on public.inscricoes
    for each row
    execute function public.impedir_inscricao_acima_das_vagas();


create or replace function public.fechar_inscricoes_ao_esgotar_vagas()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_vagas int;
    v_total int;
begin
    select vagas into v_vagas
      from public.eventos
     where id = new.evento_id;

    if v_vagas is not null and v_vagas > 0 then
        select count(*) into v_total
          from public.inscricoes
         where evento_id = new.evento_id
           and status in ('pendente', 'confirmado');

        if v_total >= v_vagas then
            update public.eventos
               set inscricoes_abertas = false
             where id = new.evento_id
               and inscricoes_abertas = true;
        end if;
    end if;

    return new;
end;
$$;

drop trigger if exists trg_fechar_inscricoes_ao_esgotar_vagas on public.inscricoes;

create trigger trg_fechar_inscricoes_ao_esgotar_vagas
    after insert on public.inscricoes
    for each row
    execute function public.fechar_inscricoes_ao_esgotar_vagas();
