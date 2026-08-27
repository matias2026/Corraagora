-- ============================================================================
-- CorraAgora — Impede que visitante anônimo veja e-mail e papel (role) de
-- organizadores/admins
--
-- Achado na auditoria final: a policy "profiles_select_organizador_publico"
-- (migration 0011) libera a leitura da LINHA do perfil de quem organiza um
-- evento aprovado, para mostrar o nome do organizador na página pública do
-- evento. RLS no Postgres controla LINHAS, não COLUNAS — então, mesmo o
-- front-end só pedindo "full_name, email" (e usando o e-mail apenas como
-- alternativa quando não há nome), qualquer pessoa podia chamar a API do
-- Supabase diretamente (sem passar pela tela) e pedir profiles?select=* —
-- e receber e-mail e role (admin/organizador) de qualquer organizador ou
-- administrador do site, sem estar logada. Isso é dado pessoal exposto sem
-- necessidade (LGPD) e facilita phishing mirado em quem é admin.
--
-- A correção é em nível de coluna (Postgres puro, não é RLS): tira do papel
-- "anon" a permissão de ler as colunas "email" e "role" de "profiles". A
-- leitura de "full_name" (o único dado necessário publicamente) continua
-- liberada pela policy já existente. Organizadores e admins logados
-- continuam enxergando tudo normalmente (a permissão tirada é só do "anon").
--
-- Rode no SQL Editor do projeto ymaybqujglfajllruqub.
-- ============================================================================

-- Revoga tanto de "anon" quanto de "public" (todo papel do Postgres é
-- automaticamente membro de "public" — se o GRANT original foi feito
-- pra "public" em vez de "anon" especificamente, só revogar de "anon"
-- não tira o acesso, porque o privilégio de "public" continua valendo).
revoke select (email, role) on public.profiles from anon;
revoke select (email, role) on public.profiles from public;

-- Garante que quem está logado (dono do perfil ou admin, via RLS)
-- continua enxergando essas colunas normalmente.
grant select (email, role) on public.profiles to authenticated;

-- O PostgREST guarda um cache do schema/permissões e só reflete essa
-- mudança de GRANT/REVOKE depois de recarregar. Isso força o reload.
notify pgrst, 'reload schema';
