-- ============================================================================
-- CorraAgora — Cria o bucket "eventos-regulamentos" que nunca existiu
--
-- ACHADO AO VIVO: clicar em "Ver regulamento" na página de um evento
-- dá erro. A URL gerada aponta pra um bucket "eventos-regulamentos"
-- que o Supabase responde com 404 "Bucket not found" / "NoSuchBucket"
-- — ou seja, o bucket nunca chegou a ser criado (diferente de
-- "eventos-banners" e "inscricoes-comprovantes", que existem e
-- funcionam). Isso é diferente do bug já corrigido antes no código
-- (storage.js devolvendo o caminho em vez da URL pública) — aquele
-- bug escondia este: só ficou visível agora que a URL devolvida está
-- certa, mas o bucket em si não existe.
--
-- Rode no SQL Editor do projeto ymaybqujglfajllruqub.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('eventos-regulamentos', 'eventos-regulamentos', true)
on conflict (id) do update set public = true;

drop policy if exists "regulamentos_select_publico" on storage.objects;
create policy "regulamentos_select_publico"
    on storage.objects for select
    to public
    using (bucket_id = 'eventos-regulamentos');

drop policy if exists "regulamentos_insert_organizador" on storage.objects;
create policy "regulamentos_insert_organizador"
    on storage.objects for insert
    to authenticated
    with check (bucket_id = 'eventos-regulamentos');
