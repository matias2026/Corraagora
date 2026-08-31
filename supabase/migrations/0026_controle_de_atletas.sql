-- ============================================================================
-- CorraAgora — Controle de contas de atleta (banir / reativar)
--
-- Diferente do organizador, a conta de atleta não passa por aprovação —
-- quem se cadastra já tem acesso liberado na hora. Pra dar ao admin um
-- controle equivalente ("remover acesso"), adiciona um status próprio:
--
-- status_atleta: 'ativo' (padrão, todo mundo já existente vira isso) ou
-- 'banido'. Um atleta banido continua conseguindo logar e ver as próprias
-- inscrições antigas (não apagamos nada), mas não consegue mais criar
-- NENHUMA inscrição nova — nem pra si, nem "para um amigo" — enquanto
-- estiver logado com essa conta. Isso é reforçado na própria policy de
-- INSERT de "inscricoes", não só na tela: mesmo chamando a API direto,
-- a conta banida não passa.
--
-- Limitação importante (mesma já registrada para organizador): isto NÃO
-- bloqueia o login em si (exigiria a chave de serviço do Supabase, que
-- este projeto não usa). Um atleta banido pode deslogar e se inscrever
-- de novo sem conta nenhuma, do mesmo jeito que qualquer visitante sem
-- cadastro sempre pôde. O controle aqui é sobre a CONTA, não sobre a
-- pessoa se inscrever anonimamente.
--
-- Rode no SQL Editor do projeto ymaybqujglfajllruqub.
-- ============================================================================

alter table public.profiles
    add column if not exists status_atleta text not null default 'ativo';

alter table public.profiles drop constraint if exists profiles_status_atleta_check;

alter table public.profiles
    add constraint profiles_status_atleta_check
    check (status_atleta in ('ativo', 'banido'));

drop policy if exists "Visitante realiza inscrição" on public.inscricoes;

create policy "Visitante realiza inscrição"
    on public.inscricoes for insert
    to anon, authenticated
    with check (
        status = 'pendente'
        and (usuario_id is null or usuario_id = auth.uid())
        and not exists (
            select 1
            from public.profiles
            where profiles.id = auth.uid()
              and profiles.status_atleta = 'banido'
        )
        and exists (
            select 1
            from public.eventos
            where eventos.id = inscricoes.evento_id
              and eventos.status = 'aprovado'
              and eventos.inscricoes_abertas = true
        )
    );
