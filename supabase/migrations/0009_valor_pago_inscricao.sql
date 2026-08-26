-- ============================================================================
-- CorraAgora — Guarda o valor pago no momento da inscrição
--
-- Hoje a inscrição guarda só o NOME da categoria escolhida, não o
-- preço vigente na hora. Isso deixa "Receita" impossível de calcular
-- direito (o preço muda de lote pra lote, e pode ser editado depois
-- pelo organizador) — por isso o resumo de "Meus eventos" mostrava
-- sempre R$ 0,00.
--
-- Rode no SQL Editor do projeto ymaybqujglfajllruqub, como as
-- migrations anteriores.
-- ============================================================================

alter table public.inscricoes
    add column if not exists valor_pago numeric;
