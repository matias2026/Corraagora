-- ============================================================================
-- CorraAgora — Rate limit por IP na API de inscrição
--
-- A API /api/inscricao (que valida o reCAPTCHA antes de gravar a inscrição)
-- é uma rota pública, sem limite de quantas vezes pode ser chamada. Alguém
-- rodando um script contra ela — mesmo sendo barrado pelo reCAPTCHA — ainda
-- consome uma chamada de rede ao Google a cada tentativa, o que pode
-- estourar cota/deixar a function lenta em caso de volume alto.
--
-- Esta tabela guarda, por IP, quantas tentativas aconteceram na janela de
-- tempo atual. A função abaixo confere e incrementa numa única operação
-- (mesmo padrão atômico já usado no limite de uso de cupom, migration 0029)
-- — evita condição de corrida entre requisições simultâneas do mesmo IP.
--
-- Rode no SQL Editor do projeto ymaybqujglfajllruqub.
-- ============================================================================

create table if not exists public.rate_limit_inscricao (
    ip text primary key,
    tentativas int not null default 0,
    janela_inicio timestamptz not null default now()
);

alter table public.rate_limit_inscricao enable row level security;

-- Ninguém acessa essa tabela diretamente (nem leitura) — só a função abaixo,
-- que roda como security definer.
revoke all on public.rate_limit_inscricao from anon, authenticated;

create or replace function public.verificar_rate_limit_inscricao(
    p_ip text,
    p_limite int default 3,
    p_janela_segundos int default 60
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
    v_tentativas int;
begin
    if p_ip is null or p_ip = '' then
        -- Sem IP identificável, não dá pra aplicar o limite — deixa passar
        -- (o reCAPTCHA continua sendo a barreira principal nesse caso raro).
        return true;
    end if;

    insert into public.rate_limit_inscricao as r (ip, tentativas, janela_inicio)
    values (p_ip, 1, now())
    on conflict (ip) do update
        set tentativas = case
                when r.janela_inicio < now() - make_interval(secs => p_janela_segundos)
                    then 1
                else r.tentativas + 1
            end,
            janela_inicio = case
                when r.janela_inicio < now() - make_interval(secs => p_janela_segundos)
                    then now()
                else r.janela_inicio
            end
    returning tentativas into v_tentativas;

    return v_tentativas <= p_limite;
end;
$$;

grant execute on function public.verificar_rate_limit_inscricao(text, int, int) to anon, authenticated;
