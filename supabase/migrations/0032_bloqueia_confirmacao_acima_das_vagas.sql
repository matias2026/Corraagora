-- ============================================================================
-- CorraAgora — Bloqueia confirmar inscrição além do limite de vagas
--
-- Achado: a página pública só AVISA quando as vagas esgotam (decisão do
-- organizador, migration 0030) — continua sendo possível se inscrever
-- ("pendente") depois de esgotado, de propósito. Mas o botão "Confirmar"
-- do painel do organizador não tinha NENHUMA checagem: dava pra confirmar
-- mais gente do que o número de vagas permite, sem aviso nenhum.
--
-- Isso agora é bloqueado direto no banco (não só na tela) — impede tanto
-- o clique acidental no painel quanto uma chamada direta na API. Só entra
-- em ação quando o STATUS está mudando PARA "confirmado"; inscrições
-- "pendente" continuam sem limite, exatamente como já decidido antes.
--
-- Rode no SQL Editor do projeto ymaybqujglfajllruqub.
-- ============================================================================

create or replace function public.impedir_excesso_de_vagas()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_vagas int;
    v_confirmados int;
begin
    if new.status = 'confirmado' and old.status is distinct from 'confirmado' then
        select vagas into v_vagas
          from public.eventos
         where id = new.evento_id;

        if v_vagas is not null and v_vagas > 0 then
            select count(*) into v_confirmados
              from public.inscricoes
             where evento_id = new.evento_id
               and status = 'confirmado'
               and id <> new.id;

            if v_confirmados >= v_vagas then
                raise exception
                    'Limite de % vaga(s) já atingido para este evento.', v_vagas;
            end if;
        end if;
    end if;

    return new;
end;
$$;

drop trigger if exists trg_impedir_excesso_de_vagas on public.inscricoes;

create trigger trg_impedir_excesso_de_vagas
    before update on public.inscricoes
    for each row
    execute function public.impedir_excesso_de_vagas();
