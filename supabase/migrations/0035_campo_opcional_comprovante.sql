-- ============================================================================
-- CorraAgora — Campo de comprovante de pagamento configurável por evento
--
-- Mesma ideia da migration 0034: o upload de comprovante de pagamento
-- não faz sentido em eventos gratuitos. Cada organizador decide, na
-- criação ou edição do evento, se quer esse campo no formulário de
-- inscrição.
--
-- Default true preserva o comportamento atual pra todos os eventos já
-- cadastrados (nenhuma mudança visual pra eles).
--
-- Rode no SQL Editor do projeto ymaybqujglfajllruqub.
-- ============================================================================

alter table public.eventos
    add column if not exists mostrar_campo_comprovante boolean not null default true;
