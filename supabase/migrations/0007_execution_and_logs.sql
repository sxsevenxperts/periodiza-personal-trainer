-- 0007_execution_and_logs.sql
create table if not exists workout_executions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions (id) on delete cascade,
  client_id uuid not null references clients (id) on delete cascade,
  started_at timestamptz,
  finished_at timestamptz,
  perceived_effort numeric,
  mood text,
  status text default 'em_andamento',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workout_executions_session on workout_executions (session_id);
create index if not exists workout_executions_client on workout_executions (client_id);

create table if not exists set_logs (
  id uuid primary key default gen_random_uuid(),
  workout_execution_id uuid not null references workout_executions (id) on delete cascade,
  prescription_item_id uuid references prescription_items (id) on delete set null,
  exercise_id uuid not null references exercises (id) on delete restrict,
  set_index integer,
  reps_done integer,
  load_kg numeric,
  rir_reported numeric,
  rpe_reported numeric,
  rest_taken_seconds integer,
  is_warmup bool,
  failed bool default false,
  notes text,
  logged_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists set_logs_execution on set_logs (workout_execution_id);

create table if not exists exercise_substitution_log (
  id uuid primary key default gen_random_uuid(),
  workout_execution_id uuid references workout_executions (id) on delete set null,
  from_exercise_id uuid not null references exercises (id) on delete restrict,
  to_exercise_id uuid not null references exercises (id) on delete restrict,
  reason text,
  score numeric,
  decided_by text,
  created_at timestamptz not null default now()
);
