-- ============================================================================
-- CorraAgora — Lotes ganham data de início (além da data limite)
--
-- Passa a mostrar "1º Lote: 01/11/2026 até 20/11/2026" em vez de só a
-- data limite. Lotes já cadastrados ficam com data_inicio nula e o site
-- cai de volta para mostrar só "até [data_limite]" nesses casos.
-- ============================================================================

alter table public.lotes
    add column if not exists data_inicio date;
