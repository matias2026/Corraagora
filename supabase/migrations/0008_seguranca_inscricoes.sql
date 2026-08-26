-- ============================================================================
-- CorraAgora — Trava o acesso a "inscricoes": só o dono do evento ou
-- o admin podem ver e atualizar os inscritos.
--
-- ATENÇÃO — rode isso o quanto antes. Nenhuma migration anterior cria
-- uma policy de SELECT ou UPDATE na tabela "inscricoes" para o
-- organizador ou o admin. Só existem: o INSERT público (migration
-- 0005, usado pelo atleta ao se inscrever) e a função com privilégio
-- elevado "consultar_inscricao" (migration 0004, usada pelo atleta
-- pra conferir a própria inscrição por CPF + e-mail).
--
-- As páginas do painel (organizador/inscritos.html, o resumo de
-- "Meus eventos") fazem "select * from inscricoes where evento_id =
-- ..." direto pelo navegador, sem checar dono nenhum no código — elas
-- dependem 100% do RLS do banco pra impedir que um organizador veja
-- os inscritos de evento de outra pessoa. Se essa policy nunca foi
-- criada direto no painel do Supabase (fora do controle de versão,
-- como aconteceu com os buckets "eventos-banners" e
-- "eventos-regulamentos", que também não estão em nenhuma migration),
-- duas coisas graves podem estar acontecendo agora:
--
--   1) RLS ligado sem nenhuma policy de SELECT/UPDATE = ninguém
--      consegue ler nada (o painel de inscritos fica sempre vazio
--      pra todo mundo, inclusive o dono do evento); ou
--
--   2) RLS desligado, ou com uma policy aberta demais criada manual
--      no painel = qualquer pessoa com a chave pública do projeto
--      (que fica exposta no código-fonte, é assim mesmo que o
--      Supabase funciona) consegue ler CPF, e-mail, telefone e data
--      de nascimento de TODOS os inscritos de TODOS os eventos.
--
-- Rode este script no SQL Editor do projeto ymaybqujglfajllruqub e
-- depois confira em Database > Policies que a tabela "inscricoes"
-- ficou com exatamente estas regras (mais o INSERT que já existia).
-- ============================================================================

alter table public.inscricoes enable row level security;

drop policy if exists "inscricoes_select_dono_ou_admin" on public.inscricoes;
create policy "inscricoes_select_dono_ou_admin"
    on public.inscricoes for select
    to authenticated
    using (
        exists (
            select 1 from public.eventos
            where eventos.id = inscricoes.evento_id
              and (eventos.organizador_id = auth.uid() or public.is_admin())
        )
    );

drop policy if exists "inscricoes_update_dono_ou_admin" on public.inscricoes;
create policy "inscricoes_update_dono_ou_admin"
    on public.inscricoes for update
    to authenticated
    using (
        exists (
            select 1 from public.eventos
            where eventos.id = inscricoes.evento_id
              and (eventos.organizador_id = auth.uid() or public.is_admin())
        )
    )
    with check (
        exists (
            select 1 from public.eventos
            where eventos.id = inscricoes.evento_id
              and (eventos.organizador_id = auth.uid() or public.is_admin())
        )
    );

-- De propósito: nenhuma policy de DELETE. O painel só cancela uma
-- inscrição mudando o status pra "cancelado" (via UPDATE) — ninguém
-- precisa apagar a linha, e assim fica um histórico completo.
