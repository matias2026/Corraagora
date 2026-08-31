-- ============================================================================
-- CorraAgora — Impede valores negativos direto no banco (defesa em profundidade)
--
-- Campos numéricos de preço/vagas só eram validados no HTML (min="0"),
-- que uma chamada direta na REST API do Supabase ignora completamente.
-- Adiciona CHECK no banco pra essas colunas nunca aceitarem negativo,
-- não importa por onde o dado chegue.
--
-- Rode no SQL Editor do projeto ymaybqujglfajllruqub. Se algum ALTER
-- falhar, já existe uma linha com valor negativo — me avise antes de
-- insistir, que eu ajudo a identificar e corrigir a linha primeiro.
-- ============================================================================

alter table public.eventos drop constraint if exists eventos_valor_nao_negativo;
alter table public.eventos
    add constraint eventos_valor_nao_negativo check (valor is null or valor >= 0);

alter table public.eventos drop constraint if exists eventos_vagas_nao_negativo;
alter table public.eventos
    add constraint eventos_vagas_nao_negativo check (vagas is null or vagas >= 0);

alter table public.categorias drop constraint if exists categorias_valor_nao_negativo;
alter table public.categorias
    add constraint categorias_valor_nao_negativo check (valor is null or valor >= 0);

alter table public.categoria_precos drop constraint if exists categoria_precos_valor_nao_negativo;
alter table public.categoria_precos
    add constraint categoria_precos_valor_nao_negativo check (valor >= 0);

alter table public.inscricoes drop constraint if exists inscricoes_valor_pago_nao_negativo;
alter table public.inscricoes
    add constraint inscricoes_valor_pago_nao_negativo check (valor_pago is null or valor_pago >= 0);
