-- =====================================================================
-- 0012_schema_do_projeto.sql
-- Move o projeto para um schema proprio. Idempotente.
--
-- REGRA GERAL DESTA INSTALACAO DO SUPABASE
--
-- Uma unica instancia do Supabase hospeda VARIOS projetos. O isolamento
-- acontece em duas camadas, e as duas sao necessarias:
--
--   camada 1 — entre projetos : cada projeto tem seu proprio SCHEMA
--   camada 2 — entre usuarios : RLS dentro do schema (migration 0011)
--
-- Sem a camada 1, dois projetos colidem no `public`: `clients`, `sessions`,
-- `equipment` e `profiles` sao nomes que qualquer sistema usa. O segundo
-- projeto a rodar suas migrations ou falharia, ou pior, passaria a escrever nas
-- tabelas do primeiro.
--
-- Sem a camada 2, todos os treinadores DENTRO deste projeto enxergariam os
-- alunos uns dos outros.
--
-- CONFIGURACAO NECESSARIA NO SERVIDOR
--
-- O PostgREST so expoe schemas que estao em `PGRST_DB_SCHEMAS`. Depois de
-- aplicar esta migration, a stack do Supabase precisa incluir o schema novo:
--
--   PGRST_DB_SCHEMAS=public,storage,graphql_public,periodiza
--
-- e reiniciar o servico `rest`. Sem isso a API responde 404 em tudo.
-- Detalhes em docs/SUPABASE_AUTO_HOSPEDADO.md.
--
-- O nome do schema aparece uma unica vez, na constante abaixo. Se mudar aqui,
-- mude tambem `NEXT_PUBLIC_SUPABASE_SCHEMA` no app — os dois precisam bater.
-- =====================================================================

do $migracao$
declare
  v_schema constant text := 'periodiza';

  -- Tudo que pertence a este projeto. Nomes fora desta lista ficam onde estao,
  -- para nao arrastar tabelas de outro projeto que divida o mesmo `public`.
  v_tabelas constant text[] := array[
    'organizations', 'organization_members', 'profiles',
    'clients', 'client_anamnesis', 'client_assessments', 'client_equipment_access',
    'body_regions', 'muscles', 'equipment', 'movement_patterns', 'training_methods',
    'exercises', 'exercise_variants', 'exercise_substitution_log',
    'periodizations', 'mesocycles', 'microcycles', 'sessions', 'session_blocks',
    'prescription_items', 'prescription_set_targets',
    'workout_executions', 'set_logs'
  ];

  v_views constant text[] := array['v_periodizations_expiring'];

  v_funcoes constant text[] := array[
    'set_updated_at', 'current_user_role', 'current_org_id', 'estimate_1rm',
    'handle_new_user', 'is_org_member', 'is_org_owner', 'is_staff',
    'update_exercises_search_vector', 'search_exercises',
    'pode_acessar_cliente', 'pode_acessar_periodizacao',
    'pode_acessar_sessao', 'pode_acessar_execucao'
  ];

  r record;
  v_nome text;
begin
  execute format('create schema if not exists %I', v_schema);

  -- Sem `usage` no schema, nem o RLS chega a ser avaliado: o acesso morre antes.
  execute format('grant usage on schema %I to anon, authenticated, service_role', v_schema);

  -- ---------------------------------------------------------------
  -- Tabelas e views. `set schema` leva junto indices, constraints,
  -- triggers, RLS e policies — nao e preciso recriar nada disso.
  -- ---------------------------------------------------------------
  foreach v_nome in array v_tabelas || v_views loop
    if exists (
      select 1 from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relname = v_nome and c.relkind in ('r','v')
    ) then
      execute format('alter table public.%I set schema %I', v_nome, v_schema);
      raise notice 'movido: %', v_nome;
    end if;
  end loop;

  -- ---------------------------------------------------------------
  -- Tipos (enums). Precisam ir junto: as colunas os referenciam.
  -- ---------------------------------------------------------------
  for r in
    select t.typname
      from pg_type t
      join pg_namespace n on n.oid = t.typnamespace
     where n.nspname = 'public' and t.typtype = 'e'
  loop
    execute format('alter type public.%I set schema %I', r.typname, v_schema);
  end loop;

  -- ---------------------------------------------------------------
  -- Funcoes. Iteramos sobre pg_proc para pegar a assinatura exata —
  -- `alter function` exige os tipos dos argumentos.
  -- ---------------------------------------------------------------
  for r in
    select p.oid, p.proname, pg_get_function_identity_arguments(p.oid) as args
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.prokind = 'f' and p.proname = any(v_funcoes)
  loop
    execute format('alter function public.%I(%s) set schema %I', r.proname, r.args, v_schema);
  end loop;

  -- Mover a funcao NAO conserta o que ela faz por dentro. Duas coisas ficam
  -- apontando para o lugar errado:
  --
  --   a) corpos com `public.profiles`, `public.clients` etc. — depois da
  --      mudanca essas referencias somem, ou pior, encontram a tabela
  --      homonima de OUTRO projeto que ainda esteja no public;
  --   b) `search_path = pg_catalog, public, pg_temp`, que faz os nomes sem
  --      qualificacao procurarem no schema errado.
  --
  -- Sintoma observado no teste: `ERROR: relation "public.profiles" does not
  -- exist` ao inserir em auth.users, disparado pelo trigger handle_new_user.
  --
  -- A reescrita usa pg_get_functiondef e troca o prefixo. Nenhuma funcao deste
  -- projeto tem a string "public." dentro de literal de texto — se alguma
  -- passar a ter, esta substituicao precisa virar uma reescrita explicita.
  for r in
    select p.oid, p.proname,
           pg_get_function_identity_arguments(p.oid) as args,
           pg_get_functiondef(p.oid) as def
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = v_schema and p.prokind = 'f' and p.proname = any(v_funcoes)
  loop
    if r.def like '%public.%' then
      execute replace(r.def, 'public.', v_schema || '.');
    end if;

    -- Depois do replace, para sobrescrever o SET herdado da definicao antiga.
    -- `extensions` entra porque unaccent e pg_trgm vivem la.
    execute format(
      'alter function %I.%I(%s) set search_path = pg_catalog, %I, extensions, pg_temp',
      v_schema, r.proname, r.args, v_schema);
  end loop;

  -- ---------------------------------------------------------------
  -- Privilegios. O RLS decide QUAIS linhas; o grant decide se a tabela
  -- e alcancavel. Os dois precisam existir.
  -- ---------------------------------------------------------------
  execute format(
    'grant select, insert, update, delete on all tables in schema %I to authenticated', v_schema);
  execute format('grant select on all tables in schema %I to anon', v_schema);
  execute format('grant all on all tables in schema %I to service_role', v_schema);
  execute format('grant execute on all functions in schema %I to anon, authenticated, service_role', v_schema);
  execute format('grant usage, select on all sequences in schema %I to authenticated, service_role', v_schema);

  -- Vale tambem para o que for criado depois, senao a proxima migration
  -- cria tabela inacessivel.
  execute format(
    'alter default privileges in schema %I grant select, insert, update, delete on tables to authenticated', v_schema);
  execute format(
    'alter default privileges in schema %I grant all on tables to service_role', v_schema);
end
$migracao$;

-- =====================================================================
-- Funcoes auxiliares do RLS, recriadas para apontar ao schema novo.
--
-- Os corpos da 0011 referenciam `public.clients` explicitamente; depois da
-- mudanca de schema essas referencias apontariam para o nada (ou, pior, para a
-- tabela homonima de OUTRO projeto que ainda esteja no public). As policies
-- guardam a funcao por OID, entao continuam ligadas as mesmas funcoes — basta
-- corrigir o corpo.
--
-- `search_path` inclui `extensions` porque unaccent e pg_trgm vivem la.
-- =====================================================================

create or replace function periodiza.pode_acessar_cliente(p_client_id uuid)
returns boolean language sql stable security definer
set search_path = pg_catalog, periodiza, extensions, pg_temp
as $$
  select exists (
    select 1 from periodiza.clients c
     where c.id = p_client_id
       and (c.personal_id = auth.uid() or c.profile_id = auth.uid())
  );
$$;

create or replace function periodiza.pode_acessar_periodizacao(p_periodization_id uuid)
returns boolean language sql stable security definer
set search_path = pg_catalog, periodiza, extensions, pg_temp
as $$
  select exists (
    select 1 from periodiza.periodizations p
     where p.id = p_periodization_id
       and (p.created_by = auth.uid() or periodiza.pode_acessar_cliente(p.client_id))
  );
$$;

create or replace function periodiza.pode_acessar_sessao(p_session_id uuid)
returns boolean language sql stable security definer
set search_path = pg_catalog, periodiza, extensions, pg_temp
as $$
  select exists (
    select 1
      from periodiza.sessions s
      join periodiza.microcycles mi on mi.id = s.microcycle_id
      join periodiza.mesocycles  me on me.id = mi.mesocycle_id
     where s.id = p_session_id
       and periodiza.pode_acessar_periodizacao(me.periodization_id)
  );
$$;

create or replace function periodiza.pode_acessar_execucao(p_execution_id uuid)
returns boolean language sql stable security definer
set search_path = pg_catalog, periodiza, extensions, pg_temp
as $$
  select exists (
    select 1 from periodiza.workout_executions w
     where w.id = p_execution_id
       and periodiza.pode_acessar_cliente(w.client_id)
  );
$$;

comment on schema periodiza is
  'Projeto Periodiza. Isolado dos demais projetos desta instancia do Supabase. '
  'Exige PGRST_DB_SCHEMAS incluindo "periodiza" e o app configurado com '
  'db.schema = periodiza.';
