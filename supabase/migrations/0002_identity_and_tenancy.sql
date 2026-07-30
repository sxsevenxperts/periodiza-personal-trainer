-- =====================================================================
-- 0002_identity_and_tenancy.sql
-- Organizacoes (tenant), perfis (1:1 com auth.users) e vinculo de equipe.
--
-- Modelo de tenancy: TODA tabela de negocio carrega organization_id.
-- A raiz da arvore e organizations; o isolamento e garantido por RLS
-- (0008) usando public.current_org_id().
-- =====================================================================

-- ---------------------------------------------------------------------
-- organizations — o tenant. Um personal autonomo tambem e uma organization
-- (com um unico membro), o que evita dois caminhos de codigo diferentes.
-- ---------------------------------------------------------------------
create table if not exists public.organizations (
  id                    uuid primary key default gen_random_uuid(),
  name                  text        not null,
  slug                  text        not null,
  legal_name            text,
  tax_id                text,
  owner_id              uuid        references auth.users (id) on delete restrict,

  plan                  public.org_plan            not null default 'trial',
  subscription_status   public.subscription_status not null default 'trialing',
  trial_ends_at         timestamptz,
  current_period_end    timestamptz,
  max_clients           integer,
  max_seats             integer,

  logo_url              text,
  primary_color         text,
  timezone              text        not null default 'America/Sao_Paulo',
  locale                text        not null default 'pt-BR',
  settings              jsonb       not null default '{}'::jsonb,

  is_active             boolean     not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  constraint organizations_slug_key    unique (slug),
  constraint organizations_slug_format check (slug ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?$'),
  constraint organizations_max_clients_positive check (max_clients is null or max_clients > 0),
  constraint organizations_max_seats_positive   check (max_seats   is null or max_seats   > 0)
);

comment on table  public.organizations is 'Tenant raiz. Estudio ou personal autonomo. Todo dado de negocio pendura aqui.';
comment on column public.organizations.slug is 'Identificador url-safe unico, usado em subdominio/deep link.';
comment on column public.organizations.owner_id is 'auth.users do dono. Referencia direta a auth.users para nao criar ciclo com profiles.';
comment on column public.organizations.max_clients is 'Teto de alunos ativos do plano. NULL = ilimitado.';
comment on column public.organizations.settings is 'Preferencias do tenant (arredondamento de anilha, unidades, defaults do builder).';

create index if not exists organizations_owner_id_idx on public.organizations (owner_id);
create index if not exists organizations_plan_idx     on public.organizations (plan, subscription_status);
create index if not exists organizations_active_idx   on public.organizations (is_active) where is_active;

-- ---------------------------------------------------------------------
-- profiles — 1:1 com auth.users. Espelha o usuario autenticado e guarda
-- o papel e a organizacao ATIVA (para quem participa de mais de uma).
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id                uuid primary key references auth.users (id) on delete cascade,
  organization_id   uuid             references public.organizations (id) on delete set null,
  role              public.user_role not null default 'aluno',

  full_name         text,
  email             text,
  phone             text,
  avatar_url        text,
  birth_date        date,

  -- exclusivo de personal / assistente
  cref              text,
  cref_state        char(2),
  specialties       text[]      not null default '{}',
  bio               text,

  locale            text        not null default 'pt-BR',
  timezone          text        not null default 'America/Sao_Paulo',
  onboarding_done   boolean     not null default false,
  is_active         boolean     not null default true,
  last_seen_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  -- o aluno so precisa de organizacao quando tem login vinculado a um personal
  constraint profiles_staff_requires_org
    check (role = 'aluno' or organization_id is not null)
);

comment on table  public.profiles is '1:1 com auth.users. Fonte de verdade do papel do usuario e da organizacao ativa.';
comment on column public.profiles.organization_id is 'Organizacao ATIVA do usuario. Trocar de org = atualizar esta coluna (precisa existir organization_members correspondente).';
comment on column public.profiles.role is 'owner/personal/assistente operam a organizacao; aluno so enxerga os proprios dados.';
comment on column public.profiles.cref is 'Registro no Conselho Regional de Educacao Fisica. Obrigatorio na UI para quem prescreve.';
comment on column public.profiles.specialties is 'Especialidades declaradas (ex: forca, reabilitacao, corrida). Usado em marketplace/relatorio.';

create index if not exists profiles_organization_id_idx on public.profiles (organization_id);
create index if not exists profiles_role_idx            on public.profiles (organization_id, role);
create index if not exists profiles_email_idx           on public.profiles (lower(email));
create index if not exists profiles_active_idx          on public.profiles (organization_id) where is_active;

-- ---------------------------------------------------------------------
-- organization_members — vinculo N:N entre equipe e organizacao.
-- Um personal pode atender em mais de um estudio.
-- ---------------------------------------------------------------------
create table if not exists public.organization_members (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations (id) on delete cascade,
  profile_id        uuid not null references public.profiles (id)      on delete cascade,
  role              public.user_role not null default 'personal',

  is_active         boolean     not null default true,
  invited_by        uuid        references public.profiles (id) on delete set null,
  invited_at        timestamptz,
  accepted_at       timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint organization_members_unique unique (organization_id, profile_id),
  -- membro de organizacao e sempre equipe; aluno nunca vira membership
  constraint organization_members_role_is_staff
    check (role in ('owner','personal','assistente'))
);

comment on table  public.organization_members is 'Vinculo equipe <-> organizacao. Permite o mesmo personal atuar em varios estudios.';
comment on column public.organization_members.role is 'Papel DENTRO desta organizacao; pode divergir de profiles.role quando o usuario atua em varias orgs.';

create index if not exists organization_members_organization_id_idx on public.organization_members (organization_id);
create index if not exists organization_members_profile_id_idx      on public.organization_members (profile_id);
create index if not exists organization_members_active_idx          on public.organization_members (organization_id, role) where is_active;

-- ---------------------------------------------------------------------
-- Funcoes de contexto usadas por TODAS as policies de RLS.
--
-- Por que SECURITY DEFINER: as policies de profiles/organization_members
-- precisam consultar essas mesmas tabelas. Se a consulta fosse feita
-- inline dentro da policy, o Postgres reaplicaria a policy sobre a
-- subconsulta e entraria em recursao infinita (42P17).
-- O dono da funcao (postgres) e dono das tabelas e, por padrao, NAO esta
-- sujeito a RLS delas (nao usamos FORCE ROW LEVEL SECURITY), entao a
-- leitura interna acontece sem reentrar na policy.
--
-- search_path travado em pg_catalog, public, pg_temp para impedir
-- sequestro de resolucao de nome por objeto malicioso em schema temporario.
-- STABLE permite ao planner cachear o resultado dentro do statement.
-- ---------------------------------------------------------------------
create or replace function public.current_org_id()
returns uuid
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select p.organization_id
    from public.profiles p
   where p.id = auth.uid();
$$;

comment on function public.current_org_id() is
  'Organizacao ativa do usuario autenticado. Base de todo isolamento multi-tenant. SECURITY DEFINER para evitar recursao de policy.';

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select p.role
    from public.profiles p
   where p.id = auth.uid();
$$;

comment on function public.current_user_role() is 'Papel do usuario autenticado, sem reentrar na RLS de profiles.';

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select exists (
    select 1
      from public.profiles p
     where p.id = auth.uid()
       and p.is_active
       and p.role in ('owner','personal','assistente')
  );
$$;

comment on function public.is_staff() is 'TRUE quando o usuario e equipe da organizacao (owner/personal/assistente), FALSE para aluno.';

create or replace function public.is_org_owner()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select exists (
    select 1
      from public.profiles p
     where p.id = auth.uid()
       and p.role = 'owner'
  );
$$;

comment on function public.is_org_owner() is 'TRUE somente para o dono da organizacao. Usado em policies de billing e de exclusao.';

create or replace function public.is_org_member(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select exists (
    select 1
      from public.organization_members m
     where m.organization_id = p_organization_id
       and m.profile_id      = auth.uid()
       and m.is_active
  );
$$;

comment on function public.is_org_member(uuid) is
  'TRUE quando o usuario tem membership ativa na organizacao informada. Util para troca de organizacao ativa.';

-- Somente papeis autenticados executam. anon nao tem contexto de tenant.
revoke execute on function public.current_org_id()        from public;
revoke execute on function public.current_user_role()     from public;
revoke execute on function public.is_staff()              from public;
revoke execute on function public.is_org_owner()          from public;
revoke execute on function public.is_org_member(uuid)     from public;

grant execute on function public.current_org_id()      to authenticated, service_role;
grant execute on function public.current_user_role()   to authenticated, service_role;
grant execute on function public.is_staff()            to authenticated, service_role;
grant execute on function public.is_org_owner()        to authenticated, service_role;
grant execute on function public.is_org_member(uuid)   to authenticated, service_role;

-- ---------------------------------------------------------------------
-- Provisionamento automatico de profile no signup.
-- Envolvido em bloco defensivo: ambientes sem privilegio sobre auth.users
-- (ex: replica gerenciada) apenas registram um aviso em vez de quebrar.
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url',
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'aluno')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

comment on function public.handle_new_user() is
  'Cria o profile espelho quando um usuario e criado em auth.users. role default aluno; o convite de equipe promove depois.';

do $$
begin
  drop trigger if exists on_auth_user_created on auth.users;
  create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();
exception
  when insufficient_privilege then
    raise notice 'Sem privilegio para criar trigger em auth.users; crie o profile pela camada de aplicacao.';
end
$$;
