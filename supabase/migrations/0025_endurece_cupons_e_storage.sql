-- ============================================================================
-- CorraAgora — Fecha enumeração de cupons e upload sem dono em regulamentos
--
-- Achados da auditoria de segurança (passada mais profunda):
--
-- 1) A policy "cupons_select_publico_ou_dono_ou_admin" deixava qualquer
--    visitante anônimo listar a tabela "cupons" inteira (testado ao vivo:
--    select * from cupons retornava todos os códigos ativos, incluindo o
--    de 100% — inscrição grátis). Isso anula o propósito do cupom, que é
--    ser dado só a quem o organizador escolher.
--
--    Corrige trocando o SELECT público por uma função (RPC) que só
--    confirma se UM código específico é válido para UM evento — nunca
--    lista os outros. A tabela em si volta a ser visível só pro dono do
--    evento (painel do organizador) ou admin.
--
-- 2) O bucket "eventos-regulamentos" tinha DUAS policies de INSERT ativas
--    ao mesmo tempo: uma restrita por dono
--    ((storage.foldername(name))[1] = auth.uid()) e uma antiga, mais
--    aberta ("regulamentos_insert_organizador", só conferia o nome do
--    bucket). Como policies permissivas se combinam com "OU", a mais
--    fraca vencia — qualquer conta autenticada (até um atleta comum)
--    conseguia gravar arquivo na pasta de regulamento de QUALQUER
--    organizador, não só a própria.
--
--    Corrige removendo a policy antiga e redundante. A policy restrita já
--    cobre o uso legítimo (assets/js/storage.js já sobe o arquivo pro
--    caminho "{userId}/arquivo", que é exatamente o que ela exige).
--
-- Rode no SQL Editor do projeto ymaybqujglfajllruqub.
-- ============================================================================

-- 1) Cupons: RPC de validação pontual + tabela fechada pro público
create or replace function public.validar_cupom(
    p_evento_id bigint,
    p_codigo text
)
returns table(codigo text, percentual int)
language sql
security definer
stable
set search_path = public
as $$
    select codigo, percentual
    from public.cupons
    where evento_id = p_evento_id
      and codigo = p_codigo
      and ativo = true
    limit 1;
$$;

grant execute on function public.validar_cupom(bigint, text) to anon, authenticated;

drop policy if exists "cupons_select_publico_ou_dono_ou_admin" on public.cupons;

create policy "cupons_select_dono_ou_admin"
    on public.cupons for select
    using (
        exists (
            select 1
            from public.eventos
            where eventos.id = cupons.evento_id
              and (eventos.organizador_id = auth.uid() or public.is_admin())
        )
    );

-- 2) Regulamentos: remove a policy de INSERT redundante e sem dono
drop policy if exists "regulamentos_insert_organizador" on storage.objects;
