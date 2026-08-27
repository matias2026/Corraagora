-- ============================================================================
-- CorraAgora — Corrige categorias duplicadas ao editar evento
--
-- Achado ao investigar um evento real (Desafio xcm Nisia Floresta): a
-- pagina do evento mostrava cada categoria repetida varias vezes. No banco,
-- a tabela "categorias" tinha 64 linhas para esse evento, sendo apenas 16
-- categorias unicas — cada uma duplicada 4 vezes.
--
-- Causa: ao salvar "Editar Evento", o codigo sempre apaga todas as
-- categorias do evento e insere o conjunto atual de novo (para refletir
-- edicoes, remocoes e reordenacao). Isso funciona com a policy de RLS
-- "categorias_admin_delete" (migration 0006, só admin) mas a policy de
-- DELETE do proprio organizador ("dono") para a tabela "categorias" foi
-- criada antes deste projeto, direto no Supabase, e nunca entrou nas
-- migrations — então não temos como saber exatamente o que ela verifica.
-- Na pratica, o apagar estava silenciosamente removendo 0 linhas quando
-- quem salvava era o organizador (nao o admin): DELETE sem erro, so que
-- sem afetar nenhuma linha, seguido do INSERT do conjunto inteiro de novo
-- — resultando em duplicatas a cada vez que o organizador salvava.
--
-- A correcao cria uma policy adicional e explicita para dono-ou-admin em
-- categorias. Como policies "permissivas" do Postgres se combinam com OR,
-- isso já resolve o problema sem precisar identificar/remover a policy
-- antiga (que continua existindo, só deixa de ser a única palavra final).
-- ============================================================================

drop policy if exists "categorias_dono_ou_admin_insert" on public.categorias;
create policy "categorias_dono_ou_admin_insert"
    on public.categorias for insert
    to authenticated
    with check (
        exists (
            select 1 from public.eventos
            where eventos.id = categorias.evento_id
              and (eventos.organizador_id = auth.uid() or public.is_admin())
        )
    );

drop policy if exists "categorias_dono_ou_admin_update" on public.categorias;
create policy "categorias_dono_ou_admin_update"
    on public.categorias for update
    to authenticated
    using (
        exists (
            select 1 from public.eventos
            where eventos.id = categorias.evento_id
              and (eventos.organizador_id = auth.uid() or public.is_admin())
        )
    )
    with check (
        exists (
            select 1 from public.eventos
            where eventos.id = categorias.evento_id
              and (eventos.organizador_id = auth.uid() or public.is_admin())
        )
    );

drop policy if exists "categorias_dono_ou_admin_delete" on public.categorias;
create policy "categorias_dono_ou_admin_delete"
    on public.categorias for delete
    to authenticated
    using (
        exists (
            select 1 from public.eventos
            where eventos.id = categorias.evento_id
              and (eventos.organizador_id = auth.uid() or public.is_admin())
        )
    );

-- ============================================================================
-- Limpeza única: remove as categorias duplicadas que já existem hoje,
-- mantendo sempre a linha mais antiga (menor id) de cada grupo repetido.
-- "categoria_precos" tem "on delete cascade" para categoria_id, entao os
-- precos das linhas duplicadas removidas somem junto automaticamente — os
-- precos da linha que fica (a mais antiga) nao sao afetados.
-- ============================================================================

with duplicadas as (
    select
        id,
        row_number() over (
            partition by evento_id, nome, percurso, idade_min, idade_max, sexo
            order by id
        ) as posicao
    from public.categorias
)
delete from public.categorias
where id in (
    select id from duplicadas where posicao > 1
);
