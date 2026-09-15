-- ============================================================================
-- CorraAgora — Campos opcionais da inscrição configuráveis por evento
--
-- Os campos "Equipe / assessoria" e "Licença CBC" do formulário de
-- inscrição só fazem sentido pra provas federadas de ciclismo — eventos
-- participativos (corrida, caminhada) não precisam deles. Antes eram
-- fixos pra todo evento; agora cada organizador decide, na criação ou
-- edição do evento, se quer pedir cada um desses campos.
--
-- Default true preserva o comportamento atual pra todos os eventos já
-- cadastrados (nenhuma mudança visual pra eles).
--
-- Rode no SQL Editor do projeto ymaybqujglfajllruqub.
-- ============================================================================

alter table public.eventos
    add column if not exists mostrar_campo_equipe boolean not null default true,
    add column if not exists mostrar_campo_licenca_cbc boolean not null default true;
