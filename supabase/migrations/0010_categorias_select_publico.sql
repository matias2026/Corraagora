-- ============================================================================
-- CorraAgora — Libera leitura pública de "categorias" para eventos aprovados
--
-- ACHADO TESTANDO AO VIVO: um visitante anônimo (não logado) via
-- select * from categorias retorna 0 linhas mesmo para um evento com
-- status = 'aprovado', enquanto "lotes" retorna normalmente. Ou seja,
-- a tabela "categorias" nunca teve uma policy de SELECT pública — só
-- existe a policy "categorias_admin_select" (migration 0006, só pra
-- admin) e o que já existia antes das migrations (só o dono, pelo
-- visto). Isso quebra a seção "Categorias e valores" e o campo de
-- categoria no formulário de inscrição para TODO visitante não
-- logado em TODO evento aprovado do site — não é um problema deste
-- evento de teste específico.
--
-- Rode no SQL Editor do projeto ymaybqujglfajllruqub.
-- ============================================================================

drop policy if exists "categorias_select_publico_ou_dono_ou_admin" on public.categorias;
create policy "categorias_select_publico_ou_dono_ou_admin"
    on public.categorias for select
    using (
        exists (
            select 1 from public.eventos
            where eventos.id = categorias.evento_id
              and (
                  eventos.status = 'aprovado'
                  or eventos.organizador_id = auth.uid()
                  or public.is_admin()
              )
        )
    );
