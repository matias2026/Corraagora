-- ============================================================================
-- CorraAgora — Conta de organizador precisa de aprovação do admin
--
-- Até aqui, quem se cadastrava em cadastro.html virava organizador na
-- hora, com acesso completo ao painel. A partir de agora, o cadastro
-- continua instantâneo, mas o acesso ao painel do organizador (e a
-- possibilidade de criar evento) só libera depois que o admin aprovar o
-- pedido — mesma lógica que já existe pra evento (pendente/aprovado/
-- rejeitado), só que agora também na conta.
--
-- Contas de organizador que já existiam antes desta migration (e já
-- estão em uso de verdade) são aprovadas automaticamente — ninguém que
-- já usava o site normalmente fica bloqueado por isso.
-- ============================================================================

alter table public.profiles
    add column if not exists status_organizador text
    not null default 'pendente'
    check (status_organizador in ('pendente', 'aprovado', 'rejeitado'));

-- Contas de organizador já existentes (uso real, anterior a esta
-- migration) ficam aprovadas automaticamente.
update public.profiles
set status_organizador = 'aprovado'
where role = 'organizador';

-- Admin sempre passa — status_organizador não tem efeito nenhum pra
-- quem é admin ou atleta, só é relevante pra role = 'organizador'.

-- Criar evento agora também exige que o organizador esteja aprovado
-- (soma à condição de role já criada na migration 0022).
drop policy if exists "eventos_insert_proprio" on public.eventos;
create policy "eventos_insert_proprio"
    on public.eventos for insert
    to authenticated
    with check (
        organizador_id = auth.uid()
        and exists (
            select 1 from public.profiles
            where profiles.id = auth.uid()
              and (
                  profiles.role = 'admin'
                  or (
                      profiles.role = 'organizador'
                      and profiles.status_organizador = 'aprovado'
                  )
              )
        )
    );

-- Admin passa a poder atualizar o perfil de qualquer pessoa — hoje não
-- existia NENHUMA policy de UPDATE em "profiles" (de propósito, pra
-- ninguém alterar a própria role). Precisamos disso pro admin poder
-- aprovar/rejeitar organizador pela tela. Só quem já é admin passa
-- nessa policy — ninguém ganha esse poder sozinho.
drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin"
    on public.profiles for update
    to authenticated
    using (public.is_admin())
    with check (public.is_admin());
