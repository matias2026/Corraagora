-- ============================================================================
-- CorraAgora — Cupom de desconto e caixa "Como pagar" configuráveis por evento
--
-- Mesma ideia das migrations 0034/0035: em eventos gratuitos não faz
-- sentido mostrar campo de cupom de desconto nem instruções de
-- pagamento. Cada organizador decide, na criação ou edição do evento,
-- se quer cada um desses blocos no formulário de inscrição.
--
-- Default true preserva o comportamento atual pra todos os eventos já
-- cadastrados (nenhuma mudança visual pra eles).
--
-- Rode no SQL Editor do projeto ymaybqujglfajllruqub.
-- ============================================================================

alter table public.eventos
    add column if not exists mostrar_campo_cupom boolean not null default true,
    add column if not exists mostrar_campo_pagamento boolean not null default true;
