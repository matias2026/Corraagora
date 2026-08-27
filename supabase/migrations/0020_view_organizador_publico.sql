-- ============================================================================
-- CorraAgora — Substitui o REVOKE de coluna (que não pegou) por uma view
--
-- A migration 0017 tentou revogar SELECT das colunas "email" e "role" de
-- "profiles" pro papel anônimo, mas testado ao vivo depois de rodar (e de
-- recarregar o schema do PostgREST): o e-mail continuou aparecendo. Esse
-- projeto usa o novo formato de chave do Supabase ("sb_publishable_..."),
-- e por algum motivo REVOKE em nível de coluna não está sendo respeitado
-- aqui — não vale a pena insistir numa correção que não dá pra confirmar
-- que funciona.
--
-- Troca de abordagem: em vez de tentar esconder colunas de uma tabela que
-- fica pública, cria uma VIEW que já nasce só com as colunas seguras
-- (id, full_name) e com o filtro "organizador de evento aprovado" embutido
-- na própria definição — não depende de RLS nem de GRANT/REVOKE de coluna.
-- Como a view nunca inclui "email"/"role" no SELECT, não tem como esses
-- dados vazarem por ela, não importa qual papel está consultando.
--
-- A tabela "profiles" propriamente dita volta a ficar fechada pra
-- visitante anônimo (só dono do perfil ou admin, como era antes da
-- migration 0011) — a página pública do evento passa a buscar o nome do
-- organizador nesta view em vez de "profiles" direto (já ajustado em
-- assets/js/evento.js).
--
-- Rode no SQL Editor do projeto ymaybqujglfajllruqub.
-- ============================================================================

drop policy if exists "profiles_select_organizador_publico" on public.profiles;

create or replace view public.organizadores_publicos as
select profiles.id, profiles.full_name
from public.profiles
where exists (
    select 1 from public.eventos
    where eventos.organizador_id = profiles.id
      and eventos.status = 'aprovado'
);

grant select on public.organizadores_publicos to anon, authenticated;

notify pgrst, 'reload schema';
