-- ============================================================================
-- CorraAgora — Contagem pública de inscritos (só para avisar "vagas esgotadas")
--
-- Achado da auditoria: o campo "vagas" do evento é só informativo, nada
-- confere isso hoje. Decisão do organizador: não bloquear a inscrição
-- quando esgotar (ele quer decidir manualmente quem confirmar), só avisar
-- visualmente na página pública.
--
-- Para mostrar esse aviso sem abrir a tabela "inscricoes" (que tem CPF e
-- outros dados sensíveis, sem SELECT público de propósito), esta função
-- devolve só a contagem — nunca os dados das inscrições.
--
-- Rode no SQL Editor do projeto ymaybqujglfajllruqub.
-- ============================================================================

create or replace function public.contar_inscritos_evento(p_evento_id bigint)
returns bigint
language sql
security definer
stable
set search_path = public
as $$
    select count(*)
    from public.inscricoes
    where evento_id = p_evento_id
      and status in ('pendente', 'confirmado');
$$;

grant execute on function public.contar_inscritos_evento(bigint) to anon, authenticated;
