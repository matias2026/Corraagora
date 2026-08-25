-- ============================================================================
-- CorraAgora — Inscrição com comprovante de pagamento
--
-- Rode no SQL Editor do projeto ymaybqujglfajllruqub, como fez com
-- as migrations anteriores.
-- ============================================================================

-- 1) Evento passa a ter dados de pagamento (PIX etc.), preenchidos
--    pelo organizador ao criar/editar o evento.
alter table public.eventos
    add column if not exists informacoes_pagamento text;

-- 2) Inscrição passa a guardar o link do comprovante enviado pelo
--    atleta, e o status sempre nasce "pendente" até o organizador
--    conferir o pagamento e confirmar.
alter table public.inscricoes
    add column if not exists comprovante_url text;

alter table public.inscricoes
    alter column status set default 'pendente';

-- 3) Bucket de storage para os comprovantes (segue o mesmo padrão
--    já usado para banners de evento: bucket público, nome do
--    arquivo prefixado pelo id do evento).
insert into storage.buckets (id, name, public)
values ('inscricoes-comprovantes', 'inscricoes-comprovantes', true)
on conflict (id) do nothing;

drop policy if exists "Visitante envia comprovante" on storage.objects;
create policy "Visitante envia comprovante"
    on storage.objects for insert
    to public
    with check (bucket_id = 'inscricoes-comprovantes');

drop policy if exists "Leitura publica de comprovantes" on storage.objects;
create policy "Leitura publica de comprovantes"
    on storage.objects for select
    to public
    using (bucket_id = 'inscricoes-comprovantes');
