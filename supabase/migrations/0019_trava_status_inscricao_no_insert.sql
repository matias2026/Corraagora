-- ============================================================================
-- CorraAgora — Impede que o próprio atleta insira a inscrição já "confirmada"
--
-- FALHA GRAVE achada na auditoria final: a policy de INSERT em "inscricoes"
-- (migration 0005) só confere se o evento existe, está aprovado e com
-- inscrições abertas — não confere os VALORES sendo inseridos. Testado ao
-- vivo com uma chamada anônima real (sem login nenhum): foi possível
-- inserir uma inscrição já com status = 'confirmado' e valor_pago = 0,
-- pulando completamente a conferência manual do organizador (que é a
-- única "trava de pagamento" que existe hoje, já que o site não processa
-- pagamento nenhum). Ou seja, qualquer pessoa podia se autoconfirmar numa
-- prova sem pagar nada e sem enviar comprovante.
--
-- A correção soma uma condição a mais no WITH CHECK: só aceita o INSERT
-- se o status enviado for 'pendente' (o único valor que o formulário de
-- inscrição já usa hoje — assets/js/inscricao.js sempre manda "pendente").
-- Confirmar ou cancelar uma inscrição continua sendo só por UPDATE, e essa
-- tabela já tem policy de UPDATE restrita a dono do evento ou admin
-- (migration 0008) — então depois do INSERT, só o organizador ou o admin
-- conseguem mudar o status.
--
-- Também apaga as inscrições de teste inseridas durante esta auditoria de
-- segurança (código começando com "AUDIT-TEST-").
--
-- Rode no SQL Editor do projeto ymaybqujglfajllruqub.
-- ============================================================================

drop policy if exists "Visitante realiza inscrição" on public.inscricoes;

create policy "Visitante realiza inscrição"
    on public.inscricoes for insert
    to anon, authenticated
    with check (
        status = 'pendente'
        and exists (
            select 1
            from public.eventos
            where eventos.id = inscricoes.evento_id
              and eventos.status = 'aprovado'
              and eventos.inscricoes_abertas = true
        )
    );

delete from public.inscricoes
where codigo_inscricao like 'AUDIT-TEST-%';
