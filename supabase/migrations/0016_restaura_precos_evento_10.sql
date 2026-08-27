-- ============================================================================
-- CorraAgora — Restaura precos perdidos na limpeza de duplicatas (migration 0015)
--
-- ERRO MEU na migration 0015: ao remover as categorias duplicadas eu mantive
-- sempre a linha de MENOR id de cada grupo repetido, presumindo que era a
-- "original". Nesse evento (id 10), porem, as primeiras 16 linhas (as de
-- menor id) eram de uma tentativa de salvamento incompleta e nunca tinham
-- ganhado uma linha em "categoria_precos" — quem tinha o preco vinculado
-- eram as copias duplicadas de id mais alto, que a 0015 apagou (o "on
-- delete cascade" levou os precos junto). Resultado: as 16 categorias que
-- sobraram ficaram sem preco (R$ 0,00 na tela de editar e, provavelmente,
-- na pagina publica do evento tambem).
--
-- Todas as evidencias coletadas antes da limpeza (pagina publica do evento
-- e o formulario de edicao) mostravam R$ 100,00 em todas as 16 categorias,
-- e o modelo de preco deste projeto e "um valor por lote vale pra todas as
-- categorias" — entao restauramos exatamente isso: uma linha em
-- categoria_precos por categoria, ligada ao unico lote existente
-- ("Primeiro lote", id 18), com valor 100.
-- ============================================================================

insert into public.categoria_precos (categoria_id, lote_id, valor)
select categorias.id, lotes.id, 100
from public.categorias
cross join public.lotes
where categorias.evento_id = 10
  and lotes.evento_id = 10
  and not exists (
      select 1 from public.categoria_precos
      where categoria_precos.categoria_id = categorias.id
        and categoria_precos.lote_id = lotes.id
  );
