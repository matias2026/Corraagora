-- ============================================================================
-- CorraAgora — Endurece a trava de vagas contra requisições simultâneas
--
-- A trava de vagas (migration 0033) fazia "conta quantos já tem, se ainda
-- tem vaga deixa passar" — uma race condition clássica: se várias
-- inscrições para o MESMO evento chegarem ao mesmo tempo, todas podem
-- passar pela contagem antes de qualquer uma terminar de gravar, furando
-- o limite de vagas num ataque coordenado e simultâneo.
--
-- Corrige travando (FOR UPDATE) a linha do evento durante a contagem,
-- serializando inscrições simultâneas do MESMO evento — uma espera a
-- outra terminar antes de fazer sua própria contagem. Eventos diferentes
-- continuam sem nenhum impacto entre si (o lock é só na linha daquele
-- evento específico).
--
-- Nota: ao investigar isso, foi encontrado que já existe (criado direto
-- no painel do Supabase, sem migration correspondente) um índice único
-- "inscricoes_evento_cpf_unique" em (evento_id, cpf) — ou seja, a mesma
-- pessoa (mesmo CPF) já não consegue se inscrever duas vezes no mesmo
-- evento, mesmo por requisições simultâneas de IPs diferentes. Só está
-- documentado aqui pra constar no histórico; nada a alterar nele.
--
-- Testado com "set local role anon" (mesma role de visitante anônimo do
-- site): inscrição simples passa e confirma sozinha quando gratuita;
-- tentativa de duplicar o mesmo CPF no mesmo evento é barrada.
--
-- Rode no SQL Editor do projeto ymaybqujglfajllruqub.
-- ============================================================================

create or replace function public.impedir_inscricao_acima_das_vagas()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_vagas int;
    v_total int;
begin
    -- Trava a linha do evento até o fim desta transação: uma segunda
    -- inscrição simultânea para o MESMO evento espera esta terminar antes
    -- de fazer sua própria contagem, em vez de contar em paralelo e as
    -- duas acharem que ainda tem vaga.
    select vagas into v_vagas
      from public.eventos
     where id = new.evento_id
       for update;

    if v_vagas is not null and v_vagas > 0 then
        select count(*) into v_total
          from public.inscricoes
         where evento_id = new.evento_id
           and status in ('pendente', 'confirmado');

        if v_total >= v_vagas then
            raise exception
                'As inscrições para este evento foram encerradas — limite de % vaga(s) atingido.', v_vagas;
        end if;
    end if;

    return new;
end;
$$;
