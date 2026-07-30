-- 0010_session_label_and_search.sql
-- Adiciona session.label (A-G), periodizations.split e full-text search para exercícios

-- Session label enum (já criado em 0001, mas verificamos aqui)
alter table sessions 
  add column if not exists label session_label_enum not null default 'A';

alter table sessions
  add constraint if not exists sessions_microcycle_label_unique unique (microcycle_id, label);

-- Training split para periodization
alter table periodizations
  add column if not exists split training_split_enum not null default 'ABC';

-- Full-text search: search_vector em exercises
alter table exercises
  add column if not exists search_vector tsvector;

-- Trigger para manter search_vector atualizado
create or replace function update_exercises_search_vector()
returns trigger as $$
begin
  new.search_vector := (
    setweight(to_tsvector('portuguese', coalesce(new.name_pt, '')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(array_to_string(new.aliases_pt, ' '), '')), 'B') ||
    setweight(to_tsvector('portuguese', coalesce(new.name_en, '')), 'C') ||
    setweight(to_tsvector('portuguese', coalesce(
      (select name_pt from muscles where id = new.primary_muscle_id), ''
    )), 'D')
  );
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_exercises_search_vector_trigger on exercises;
create trigger update_exercises_search_vector_trigger
  before insert or update on exercises
  for each row
  execute function update_exercises_search_vector();

-- Índices
create index if not exists exercises_search_vector_idx on exercises using gin (search_vector);
create index if not exists exercises_name_pt_trgm_idx on exercises using gin (name_pt gin_trgm_ops);

-- RPC: search_exercises(query, filters, client_id)
create or replace function search_exercises(
  query_text text default '',
  category_filter text default null,
  movement_filter text default null,
  muscle_filter text default null,
  equipment_filter text default null,
  client_id uuid default null
)
returns table (
  exercise_id uuid,
  name_pt text,
  name_en text,
  primary_muscle text,
  movement_pattern text,
  equipment text[],
  technical_level text,
  has_restriction boolean,
  missing_equipment boolean,
  already_prescribed boolean,
  weekly_volume_series integer
) as $$
declare
  search_query tsquery;
begin
  search_query := plainto_tsquery('portuguese', query_text);

  return query
  select
    e.id,
    e.name_pt,
    e.name_en,
    (select name_pt from muscles where id = e.primary_muscle_id),
    mp.name_pt,
    e.equipment_slugs,
    e.technical_level,
    -- 🔴 Padrão restrito na anamnese
    case when ca.restricted_movement_patterns @> array[mp.slug] then true else false end,
    -- 🟡 Sem equipamento disponível
    case when not (cea.available_equipment_slugs @> e.equipment_slugs) then true else false end,
    -- 🔵 Já prescrito em outro treino do mesmo microciclo (TBD: adicionar quando temos client_id)
    false,
    -- ⚪ Volume de séries semanais no grupo muscular (TBD: implementar agregação)
    0
  from exercises e
  left join movement_patterns mp on e.movement_pattern_id = mp.id
  left join client_anamnesis ca on ca.client_id = client_id
  left join client_equipment_access cea on cea.client_id = client_id
  where
    (query_text = '' or e.search_vector @@ search_query)
    and (category_filter is null or e.catalog_group = category_filter)
    and (movement_filter is null or mp.slug = movement_filter)
    and (muscle_filter is null or e.primary_muscle_id = (select id from muscles where name_pt = muscle_filter))
    and (equipment_filter is null or e.equipment_slugs @> array[equipment_filter])
  order by
    case when query_text != '' then ts_rank(e.search_vector, search_query) else 0 end desc,
    e.name_pt asc
  limit 50;
end;
$$ language plpgsql stable security definer set search_path = public;

comment on function search_exercises is 'Busca full-text de exercícios com filtros e contexto do aluno. Retorna anotações: 🔴 restrito, 🟡 sem equipamento, 🔵 já prescrito, ⚪ volume.';

