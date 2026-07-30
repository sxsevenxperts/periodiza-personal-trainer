-- 0005_periodization.sql
create table if not exists periodizations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  client_id uuid not null references clients (id) on delete cascade,
  created_by uuid not null,
  name text not null,
  goal text,
  model text,
  start_date date not null,
  end_date date not null,
  status text not null default 'rascunho',
  split text default 'ABC',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists periodizations_client on periodizations (client_id);
create index if not exists periodizations_status on periodizations (status);

create table if not exists mesocycles (
  id uuid primary key default gen_random_uuid(),
  periodization_id uuid not null references periodizations (id) on delete cascade,
  name text not null,
  weeks integer not null,
  phase text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists microcycles (
  id uuid primary key default gen_random_uuid(),
  mesocycle_id uuid not null references mesocycles (id) on delete cascade,
  week_number integer not null,
  start_date date,
  end_date date,
  load_strategy text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  microcycle_id uuid not null references microcycles (id) on delete cascade,
  label text not null,
  name text,
  focus text,
  session_type text,
  estimated_duration_min integer,
  status text default 'planejada',
  scheduled_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (microcycle_id, label)
);

create index if not exists sessions_microcycle on sessions (microcycle_id);

create table if not exists session_blocks (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions (id) on delete cascade,
  name text,
  method text,
  created_at timestamptz not null default now()
);
