-- 0006_prescription.sql
create table if not exists training_methods (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name_pt text not null,
  description text,
  applies_to text,
  requires_group bool,
  created_at timestamptz not null default now()
);

create table if not exists prescription_items (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions (id) on delete cascade,
  session_block_id uuid references session_blocks (id),
  exercise_id uuid not null references exercises (id) on delete restrict,
  exercise_variant_id uuid references exercise_variants (id),
  order_index integer,
  series integer,
  reps_min integer,
  reps_max integer,
  load_kg numeric,
  percent_1rm numeric,
  rir_target numeric,
  rpe_target numeric,
  rest_seconds integer,
  tempo_eccentric_s numeric,
  tempo_pause_stretched_s numeric,
  tempo_concentric_s numeric,
  tempo_pause_shortened_s numeric,
  range_of_motion text,
  intentional_velocity text,
  method_id uuid references training_methods (id),
  is_warmup bool default false,
  is_working_set bool default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists prescription_items_session on prescription_items (session_id);
create index if not exists prescription_items_exercise on prescription_items (exercise_id);

create table if not exists prescription_set_targets (
  id uuid primary key default gen_random_uuid(),
  prescription_item_id uuid not null references prescription_items (id) on delete cascade,
  set_index integer,
  reps integer,
  load_kg numeric,
  created_at timestamptz not null default now()
);
