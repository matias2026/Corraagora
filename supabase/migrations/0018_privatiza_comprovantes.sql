-- ============================================================================
-- CorraAgora — Comprovantes de pagamento deixam de ser públicos
--
-- FALHA GRAVE achada na auditoria final: a migration 0003 criou o bucket
-- "inscricoes-comprovantes" como público e com uma policy de SELECT
-- "to public" (using bucket_id = 'inscricoes-comprovantes', sem nenhuma
-- outra condição) — ou seja, qualquer pessoa, sem estar logada, conseguia
-- LISTAR e BAIXAR o comprovante de pagamento de qualquer inscrição de
-- qualquer evento, sem exceção. Testado ao vivo: uma chamada anônima à
-- API do Supabase listou e baixou um comprovante real. Comprovante de
-- pagamento é documento sensível (recibo bancário, print de PIX — pode
-- conter nome do titular da conta, dados bancários), então isso é uma
-- exposição séria de dados pessoais (LGPD).
--
-- Correção:
-- 1) Bucket vira privado.
-- 2) A policy pública de SELECT é substituída por uma que só libera o
--    dono do evento (organizador) ou o admin — o mesmo padrão já usado
--    pra banner/regulamento/categorias.
-- 3) Quem faz upload continua podendo ser anônimo (a inscrição em si não
--    exige login) — a policy de INSERT não muda.
--
-- Como o bucket deixa de ser público, links antigos no formato
-- ".../object/public/inscricoes-comprovantes/..." param de funcionar —
-- o painel do organizador (Inscritos) passa a gerar um link temporário
-- (signed URL) na hora de abrir o comprovante, em vez de usar uma URL
-- pública fixa. Isso já foi ajustado no código (assets/js/inscritos.js e
-- assets/js/storage.js).
--
-- Rode no SQL Editor do projeto ymaybqujglfajllruqub.
-- ============================================================================

update storage.buckets
set public = false
where id = 'inscricoes-comprovantes';

drop policy if exists "Leitura publica de comprovantes" on storage.objects;

drop policy if exists "comprovantes_select_dono_ou_admin" on storage.objects;
create policy "comprovantes_select_dono_ou_admin"
    on storage.objects for select
    to authenticated
    using (
        bucket_id = 'inscricoes-comprovantes'
        and exists (
            select 1 from public.eventos
            where eventos.id::text = (storage.foldername(name))[1]
              and (eventos.organizador_id = auth.uid() or public.is_admin())
        )
    );
