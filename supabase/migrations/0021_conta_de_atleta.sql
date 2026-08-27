-- ============================================================================
-- CorraAgora — Conta de atleta (opcional) além de organizador/admin
--
-- Cria um terceiro tipo de conta, separado de organizador/admin, pra quem
-- se inscreve em provas. É opcional: continua dando pra se inscrever sem
-- login nenhum, exatamente como hoje. Quem cria conta ganha duas coisas:
-- 1) os dados preenchem sozinhos numa próxima inscrição (usa a inscrição
--    mais recente como referência, não precisa de tabela nova pra isso);
-- 2) uma tela própria ("Minhas inscrições") com todas as inscrições feitas
--    com a conta logada — seja em nome do próprio atleta, seja em nome de
--    um amigo que ele cadastrou por ele.
--
-- Esse tipo de conta NÃO tem acesso a nada de organizador ou admin — só
-- às próprias inscrições.
-- ============================================================================

-- 1) "profiles.role" ganha o valor "atleta".
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
    add constraint profiles_role_check
    check (role in ('organizador', 'admin', 'atleta'));

-- 2) Trigger de novo cadastro: continua ignorando qualquer coisa que o
--    formulário mande em "role" (ninguém vira admin se autocadastrando),
--    mas agora lê um sinalizador à parte ("tipo_conta") pra saber se é
--    cadastro de organizador (default, como já era) ou de atleta.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.profiles (id, email, full_name, role)
    values (
        new.id,
        new.email,
        new.raw_user_meta_data ->> 'full_name',
        case
            when new.raw_user_meta_data ->> 'tipo_conta' = 'atleta' then 'atleta'
            else 'organizador'
        end
    )
    on conflict (id) do nothing;

    return new;
end;
$$;

-- 3) "inscricoes" ganha uma coluna pra saber qual conta logada criou a
--    inscrição (null quando feita sem login, como sempre foi possível).
--    Não é o mesmo que "de quem é a inscrição" — um atleta logado pode
--    inscrever um amigo, e nesse caso o nome/CPF são do amigo, mas
--    "usuario_id" continua sendo de quem estava logado e preencheu.
alter table public.inscricoes
    add column if not exists usuario_id uuid references auth.users(id);

-- 4) Atleta logado enxerga as inscrições que ele mesmo criou (pra si ou
--    pra um amigo). Policy nova, somada à que já existe pra organizador
--    e admin — não tira nada de ninguém, só adiciona essa visão.
drop policy if exists "inscricoes_select_proprio_usuario" on public.inscricoes;
create policy "inscricoes_select_proprio_usuario"
    on public.inscricoes for select
    to authenticated
    using (usuario_id = auth.uid());

-- 5) O INSERT (feito por qualquer um, logado ou não) passa a poder
--    gravar "usuario_id" — mas só o PRÓPRIO id de quem está logado (ou
--    null, se não estiver logado). Ninguém consegue inserir uma
--    inscrição e marcar "usuario_id" de outra pessoa.
drop policy if exists "Visitante realiza inscrição" on public.inscricoes;
create policy "Visitante realiza inscrição"
    on public.inscricoes for insert
    to anon, authenticated
    with check (
        status = 'pendente'
        and (usuario_id is null or usuario_id = auth.uid())
        and exists (
            select 1
            from public.eventos
            where eventos.id = inscricoes.evento_id
              and eventos.status = 'aprovado'
              and eventos.inscricoes_abertas = true
        )
    );
