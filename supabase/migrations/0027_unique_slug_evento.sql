-- ============================================================================
-- CorraAgora — Garante slug único de evento no banco (defesa em profundidade)
--
-- O slug (usado na URL pública do evento, evento.html?slug=X) já é gerado
-- como `nome-em-slug` + timestamp em milissegundos (assets/js/novo-evento.js),
-- então uma colisão real é praticamente impossível na prática — mas nada no
-- banco garantia isso até agora. Como o slug decide qual evento a página
-- pública carrega, uma duplicata (por bug futuro, retry de rede ou chamada
-- direta na API) quebraria o roteamento de dois eventos ao mesmo tempo.
--
-- Rode no SQL Editor do projeto ymaybqujglfajllruqub. Se o ALTER falhar
-- com "duplicate key", já existe uma duplicata real — me avise antes de
-- insistir, que eu ajudo a identificar qual evento renomear.
-- ============================================================================

alter table public.eventos
    add constraint eventos_slug_unique unique (slug);
