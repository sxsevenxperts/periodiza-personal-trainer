-- 0004_exercise_catalog.sql
create table if not exists movement_patterns (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name_pt text not null,
  name_en text not null,
  dominance text,
  description text
);

create table if not exists body_regions (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name_pt text not null,
  name_en text not null
);

create table if not exists muscles (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name_pt text not null,
  name_en text not null,
  body_region_id uuid references body_regions (id)
);

create table if not exists equipment (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name_pt text not null,
  name_en text not null,
  category text
);

create table if not exists exercises (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name_pt text not null,
  name_en text not null,
  aliases_pt text[],
  catalog_group text,
  movement_pattern_id uuid references movement_patterns (id),
  body_region_id uuid references body_regions (id),
  dominance text,
  primary_muscle_id uuid references muscles (id),
  secondary_muscle_ids uuid[],
  equipment_slugs text[],
  load_type text,
  technical_level text,
  dominant_plane text,
  kinetic_chain text,
  laterality text,
  metric text,
  stability_demand text,
  resistance_curve text,
  body_position text,
  default_range_of_motion text,
  substitution_family_id uuid,
  substitution_priority integer,
  technical_cues text[],
  contraindications text[],
  is_active bool default true,
  search_vector tsvector,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists exercises_slug on exercises (slug);
create index if not exists exercises_search_gin on exercises using gin (search_vector);
create index if not exists exercises_name_trgm on exercises using gin (name_pt gin_trgm_ops);

create table if not exists exercise_variants (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references exercises (id) on delete cascade,
  slug text unique not null,
  label_pt text not null,
  axis text,
  equipment_slugs text[],
  technical_delta text,
  is_default bool default false,
  created_at timestamptz not null default now()
);

create index if not exists exercise_variants_exercise on exercise_variants (exercise_id);
