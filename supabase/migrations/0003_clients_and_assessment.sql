-- 0003_clients_and_assessment.sql
create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  personal_id uuid not null,
  profile_id uuid,
  name text not null,
  status text not null default 'ativo',
  subscription_status text,
  subscription_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists clients_organization on clients (organization_id);

create table if not exists client_anamnesis (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null unique references clients (id) on delete cascade,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists client_assessments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients (id) on delete cascade,
  assessment_date date not null,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists client_equipment_access (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null unique references clients (id) on delete cascade,
  available_equipment_slugs text[] not null default '{}',
  created_at timestamptz not null default now()
);
