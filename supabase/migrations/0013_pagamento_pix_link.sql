-- ============================================================================
-- CorraAgora — Chave PIX separada (com botão de copiar) e link de
-- pagamento externo (PIX/Cartão via operadora)
--
-- O CorraAgora continua sem processar pagamento nenhum. "chave_pix"
-- é só a chave em si (pro atleta copiar), separada do texto livre em
-- "informacoes_pagamento" (que agora é só nome + banco). "link_pagamento"
-- é opcional: um link de cobrança que o organizador já gera na própria
-- conta dele (Mercado Pago, PagSeguro, InfinitePay etc.) — o atleta é
-- levado pra lá pra pagar com PIX ou cartão pela operadora.
--
-- Rode no SQL Editor do projeto ymaybqujglfajllruqub.
-- ============================================================================

alter table public.eventos
    add column if not exists chave_pix text;

alter table public.eventos
    add column if not exists link_pagamento text;
