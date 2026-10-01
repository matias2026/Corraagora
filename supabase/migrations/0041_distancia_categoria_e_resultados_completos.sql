-- ============================================================================
-- CorraAgora — Distância por categoria + dados extras na view pública de
-- resultados (ritmo, percurso).
--
-- "categorias.percurso" já existia, mas é texto livre (ex.: "Pro (50 km)",
-- "4 km (ida e volta)") — não dá pra calcular ritmo (min/km) de forma
-- confiável a partir disso, o formato varia demais entre organizadores.
-- Por isso "distancia_km" é um campo numérico próprio, opcional: quando o
-- organizador preenche, a página de resultados calcula o ritmo; quando não
-- preenche, a coluna de ritmo simplesmente não aparece pra aquela categoria.
--
-- Rode no SQL Editor do projeto ymaybqujglfajllruqub.
-- ============================================================================

alter table public.categorias
    add column if not exists distancia_km numeric;

alter table public.categorias drop constraint if exists categorias_distancia_km_positiva;
alter table public.categorias
    add constraint categorias_distancia_km_positiva
    check (distancia_km is null or distancia_km > 0);

-- A view precisa saber o percurso e a distância da categoria pra tabela ao
-- vivo poder agrupar por percurso e calcular ritmo. Não existe uma FK entre
-- inscricoes.categoria e categorias — o vínculo sempre foi por nome dentro
-- do mesmo evento, então o join replica esse mesmo critério.
-- Postgres só permite ACRESCENTAR colunas no fim de uma view existente com
-- "create or replace" (não dá pra inserir no meio) — por isso percurso e
-- distancia_km vêm depois das colunas originais, não junto de "categoria".
create or replace view public.resultados_publicos as
select
    r.evento_id,
    i.numero,
    i.nome,
    i.categoria,
    r.tempo_liquido_segundos,
    r.horario_chegada,
    c.percurso,
    c.distancia_km
from public.resultados r
join public.inscricoes i on i.id = r.inscricao_id
left join public.categorias c
    on c.evento_id = r.evento_id
   and c.nome = i.categoria;

grant select on public.resultados_publicos to anon, authenticated;

-- A tabela ao vivo mostra "quantos completaram" por categoria (ex.: 1/2),
-- o que exige saber o total de inscritos — mas "inscricoes" tem RLS que
-- bloqueia select público (tem CPF/e-mail/telefone). Uma view separada,
-- só com a contagem agregada por categoria, expõe zero dado sensível.
create or replace view public.inscritos_por_categoria_publico as
select
    evento_id,
    categoria,
    count(*) as total_inscritos
from public.inscricoes
where status = 'confirmado'
group by evento_id, categoria;

grant select on public.inscritos_por_categoria_publico to anon, authenticated;
