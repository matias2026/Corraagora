-- ============================================================================
-- CorraAgora — Cronometragem: registro de chegada por número de peito
--
-- Novidade: painel "Cronometragem" (organizador/cronometragem.html) pra
-- registrar o horário em que cada atleta cruzou a linha de chegada,
-- identificando-o pelo número de peito, e calcular automaticamente a
-- colocação geral e por categoria.
--
-- A tabela "inscricoes" ainda não tinha nenhum desses campos. O número de
-- peito é atribuído pelo organizador antes da prova (tela de cronometragem
-- também serve pra isso); "único por evento" impede dois atletas do mesmo
-- evento com o mesmo peito.
--
-- Nenhuma policy de RLS nova é necessária: as policies de SELECT/UPDATE de
-- "inscricoes" já cobrem "dono do evento ou admin" (migration 0008) e
-- passam a valer também pras colunas novas.
--
-- Rode no SQL Editor do projeto ymaybqujglfajllruqub.
-- ============================================================================

alter table public.inscricoes
    add column if not exists numero_peito integer,
    add column if not exists horario_chegada timestamptz,
    add column if not exists posicao_geral integer,
    add column if not exists posicao_categoria integer;

create unique index if not exists inscricoes_evento_numero_peito_unique
    on public.inscricoes (evento_id, numero_peito)
    where numero_peito is not null;

-- Recalcula, numa tacada só, a colocação geral e por categoria de todo
-- mundo que já chegou num evento — chamada depois de cada registro (ou
-- estorno) de chegada, em vez de o cliente ficar calculando e escrevendo
-- linha por linha (mais simples e evita cálculo divergente entre atletas).
create or replace function public.recalcular_posicoes_chegada(p_evento_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    if not exists (
        select 1 from public.eventos
        where id = p_evento_id
          and (organizador_id = auth.uid() or public.is_admin())
    ) then
        raise exception 'Sem permissão para recalcular as colocações deste evento.';
    end if;

    with chegados as (
        select
            id,
            row_number() over (order by horario_chegada asc) as posicao_geral,
            row_number() over (partition by categoria order by horario_chegada asc) as posicao_categoria
        from public.inscricoes
        where evento_id = p_evento_id
          and status = 'confirmado'
          and horario_chegada is not null
    )
    update public.inscricoes i
       set posicao_geral = chegados.posicao_geral,
           posicao_categoria = chegados.posicao_categoria
      from chegados
     where i.id = chegados.id;
end;
$$;

grant execute on function public.recalcular_posicoes_chegada(bigint) to authenticated;
