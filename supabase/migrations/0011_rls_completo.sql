-- =====================================================================
-- 0011_rls_completo.sql
-- Fecha o isolamento por usuario. Idempotente.
--
-- PROBLEMA QUE ESTA MIGRATION RESOLVE
--
-- A 0008 deixou o RLS pela metade, de tres formas, todas graves:
--
-- 1. OITO tabelas sem RLS nenhum — entre elas `client_anamnesis` e
--    `client_assessments`, que guardam dado de saude e medidas corporais dos
--    alunos. Qualquer usuario autenticado lia e escrevia os dados de alunos de
--    qualquer outro treinador.
--
-- 2. QUATRO tabelas com RLS ligado e ZERO policies: organizations, profiles,
--    prescription_items e set_logs. No Postgres, RLS sem policy nao libera
--    nada — nega tudo. `prescription_items` e o coracao do builder, entao o
--    builder simplesmente nao enxergava exercicio nenhum.
--
-- 3. Praticamente nenhuma policy de escrita (so uma, de insert em
--    workout_executions). Criar aluno, prescrever exercicio, reordenar,
--    registrar treino — tudo negado.
--
-- Ou seja: onde havia RLS, o app nao funcionava; onde o app funcionava, nao
-- havia isolamento. Esta migration fecha os dois lados.
--
-- MODELO DE ACESSO
--
--   treinador  -> clients.personal_id = auth.uid()
--   aluno      -> clients.profile_id  = auth.uid()
--
-- Toda tabela de negocio pendura, direta ou indiretamente, em `clients` ou em
-- `periodizations`. As funcoes auxiliares abaixo resolvem essa cadeia uma vez
-- so, em vez de repetir subconsultas aninhadas em cada policy.
--
-- Catalogo (exercises, muscles, equipment, ...) e leitura publica de
-- proposito: e vocabulario compartilhado, nao dado de cliente. Escrita so por
-- service_role, via seed.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Funcoes auxiliares
--
-- `security definer` e proposital: elas consultam `clients` e
-- `periodizations`, que tem RLS. Sem isso, a policy de `clients` chamaria uma
-- funcao que le `clients` e entraria em recursao infinita.
--
-- `search_path` fixo evita que um schema malicioso no caminho sequestre os
-- nomes das tabelas — obrigatorio em qualquer funcao `security definer`.
-- ---------------------------------------------------------------------

create or replace function public.pode_acessar_cliente(p_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select exists (
    select 1
      from public.clients c
     where c.id = p_client_id
       and (c.personal_id = auth.uid() or c.profile_id = auth.uid())
  );
$$;

comment on function public.pode_acessar_cliente(uuid) is
  'True se o usuario atual e o treinador do aluno ou o proprio aluno.';

create or replace function public.pode_acessar_periodizacao(p_periodization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select exists (
    select 1
      from public.periodizations p
     where p.id = p_periodization_id
       and (p.created_by = auth.uid() or public.pode_acessar_cliente(p.client_id))
  );
$$;

comment on function public.pode_acessar_periodizacao(uuid) is
  'True se o usuario criou a periodizacao ou pode acessar o aluno dela.';

create or replace function public.pode_acessar_sessao(p_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select exists (
    select 1
      from public.sessions s
      join public.microcycles mi on mi.id = s.microcycle_id
      join public.mesocycles  me on me.id = mi.mesocycle_id
     where s.id = p_session_id
       and public.pode_acessar_periodizacao(me.periodization_id)
  );
$$;

comment on function public.pode_acessar_sessao(uuid) is
  'True se o usuario pode acessar a periodizacao a que a sessao pertence.';

create or replace function public.pode_acessar_execucao(p_execution_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select exists (
    select 1
      from public.workout_executions w
     where w.id = p_execution_id
       and public.pode_acessar_cliente(w.client_id)
  );
$$;

comment on function public.pode_acessar_execucao(uuid) is
  'True se o usuario pode acessar o aluno dono da execucao.';

-- ---------------------------------------------------------------------
-- RLS nas tabelas que estavam descobertas
-- ---------------------------------------------------------------------
alter table public.client_anamnesis          enable row level security;
alter table public.client_assessments        enable row level security;
alter table public.client_equipment_access   enable row level security;
alter table public.mesocycles                enable row level security;
alter table public.microcycles               enable row level security;
alter table public.session_blocks            enable row level security;
alter table public.prescription_set_targets  enable row level security;
alter table public.exercise_substitution_log enable row level security;
alter table public.organization_members      enable row level security;

-- Catalogo compartilhado: RLS ligado, leitura liberada, escrita so service_role.
alter table public.muscles            enable row level security;
alter table public.equipment          enable row level security;
alter table public.movement_patterns  enable row level security;
alter table public.body_regions       enable row level security;
alter table public.training_methods   enable row level security;

-- ---------------------------------------------------------------------
-- Policies
--
-- `drop policy if exists` antes de cada `create` mantem a migration
-- reaplicavel: o Postgres nao tem `create policy if not exists`.
--
-- `for all` cobre select/insert/update/delete. `using` filtra as linhas que o
-- usuario enxerga; `with check` valida as linhas que ele tenta gravar. As duas
-- clausulas sao necessarias — so `using` deixaria inserir linha de outro dono.
-- ---------------------------------------------------------------------

-- ---- identidade -----------------------------------------------------
drop policy if exists profiles_proprio on public.profiles;
create policy profiles_proprio on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists organizations_membro on public.organizations;
create policy organizations_membro on public.organizations
  for select using (
    owner_id = auth.uid()
    or exists (
      select 1 from public.organization_members m
       where m.organization_id = organizations.id and m.profile_id = auth.uid()
    )
  );

drop policy if exists organization_members_proprio on public.organization_members;
create policy organization_members_proprio on public.organization_members
  for select using (profile_id = auth.uid());

-- ---- alunos ---------------------------------------------------------
-- Substitui as duas policies de select da 0008, que nao cobriam escrita.
drop policy if exists "clients_personal_view" on public.clients;
drop policy if exists "clients_self_view"     on public.clients;
drop policy if exists clients_acesso          on public.clients;
create policy clients_acesso on public.clients
  for all
  using (personal_id = auth.uid() or profile_id = auth.uid())
  -- Na escrita so vale `personal_id`: o aluno le os proprios dados, mas nao
  -- cria nem transfere cadastro.
  with check (personal_id = auth.uid());

drop policy if exists client_anamnesis_acesso on public.client_anamnesis;
create policy client_anamnesis_acesso on public.client_anamnesis
  for all using (public.pode_acessar_cliente(client_id))
  with check (public.pode_acessar_cliente(client_id));

drop policy if exists client_assessments_acesso on public.client_assessments;
create policy client_assessments_acesso on public.client_assessments
  for all using (public.pode_acessar_cliente(client_id))
  with check (public.pode_acessar_cliente(client_id));

drop policy if exists client_equipment_access_acesso on public.client_equipment_access;
create policy client_equipment_access_acesso on public.client_equipment_access
  for all using (public.pode_acessar_cliente(client_id))
  with check (public.pode_acessar_cliente(client_id));

-- ---- periodizacao ---------------------------------------------------
drop policy if exists "periodizations_personal_view" on public.periodizations;
drop policy if exists periodizations_acesso          on public.periodizations;
create policy periodizations_acesso on public.periodizations
  for all
  using (created_by = auth.uid() or public.pode_acessar_cliente(client_id))
  with check (public.pode_acessar_cliente(client_id));

drop policy if exists mesocycles_acesso on public.mesocycles;
create policy mesocycles_acesso on public.mesocycles
  for all using (public.pode_acessar_periodizacao(periodization_id))
  with check (public.pode_acessar_periodizacao(periodization_id));

drop policy if exists microcycles_acesso on public.microcycles;
create policy microcycles_acesso on public.microcycles
  for all
  using (exists (
    select 1 from public.mesocycles me
     where me.id = microcycles.mesocycle_id
       and public.pode_acessar_periodizacao(me.periodization_id)))
  with check (exists (
    select 1 from public.mesocycles me
     where me.id = microcycles.mesocycle_id
       and public.pode_acessar_periodizacao(me.periodization_id)));

drop policy if exists "sessions_via_periodization" on public.sessions;
drop policy if exists sessions_acesso              on public.sessions;
create policy sessions_acesso on public.sessions
  for all
  using (exists (
    select 1 from public.microcycles mi
      join public.mesocycles me on me.id = mi.mesocycle_id
     where mi.id = sessions.microcycle_id
       and public.pode_acessar_periodizacao(me.periodization_id)))
  with check (exists (
    select 1 from public.microcycles mi
      join public.mesocycles me on me.id = mi.mesocycle_id
     where mi.id = sessions.microcycle_id
       and public.pode_acessar_periodizacao(me.periodization_id)));

drop policy if exists session_blocks_acesso on public.session_blocks;
create policy session_blocks_acesso on public.session_blocks
  for all using (public.pode_acessar_sessao(session_id))
  with check (public.pode_acessar_sessao(session_id));

-- ---- prescricao -----------------------------------------------------
-- Sem esta policy o builder nao lia um unico exercicio prescrito: a 0008
-- ligou o RLS de prescription_items sem criar policy nenhuma.
drop policy if exists prescription_items_acesso on public.prescription_items;
create policy prescription_items_acesso on public.prescription_items
  for all using (public.pode_acessar_sessao(session_id))
  with check (public.pode_acessar_sessao(session_id));

drop policy if exists prescription_set_targets_acesso on public.prescription_set_targets;
create policy prescription_set_targets_acesso on public.prescription_set_targets
  for all
  using (exists (
    select 1 from public.prescription_items pi
     where pi.id = prescription_set_targets.prescription_item_id
       and public.pode_acessar_sessao(pi.session_id)))
  with check (exists (
    select 1 from public.prescription_items pi
     where pi.id = prescription_set_targets.prescription_item_id
       and public.pode_acessar_sessao(pi.session_id)));

-- ---- execucao -------------------------------------------------------
drop policy if exists "workout_executions_client_self"   on public.workout_executions;
drop policy if exists "workout_executions_client_insert" on public.workout_executions;
drop policy if exists workout_executions_acesso          on public.workout_executions;
create policy workout_executions_acesso on public.workout_executions
  for all using (public.pode_acessar_cliente(client_id))
  with check (public.pode_acessar_cliente(client_id));

drop policy if exists set_logs_acesso on public.set_logs;
create policy set_logs_acesso on public.set_logs
  for all using (public.pode_acessar_execucao(workout_execution_id))
  with check (public.pode_acessar_execucao(workout_execution_id));

drop policy if exists exercise_substitution_log_acesso on public.exercise_substitution_log;
create policy exercise_substitution_log_acesso on public.exercise_substitution_log
  for all
  -- workout_execution_id e nullable (on delete set null); linha orfa fica
  -- invisivel para todo mundo, que e o comportamento seguro.
  using (workout_execution_id is not null and public.pode_acessar_execucao(workout_execution_id))
  with check (workout_execution_id is not null and public.pode_acessar_execucao(workout_execution_id));

-- ---- catalogo compartilhado ----------------------------------------
-- Leitura para qualquer usuario autenticado ou anonimo; escrita so pela
-- service_role, que ignora RLS.
drop policy if exists muscles_leitura on public.muscles;
create policy muscles_leitura on public.muscles for select using (true);

drop policy if exists equipment_leitura on public.equipment;
create policy equipment_leitura on public.equipment for select using (true);

drop policy if exists movement_patterns_leitura on public.movement_patterns;
create policy movement_patterns_leitura on public.movement_patterns for select using (true);

drop policy if exists body_regions_leitura on public.body_regions;
create policy body_regions_leitura on public.body_regions for select using (true);

drop policy if exists training_methods_leitura on public.training_methods;
create policy training_methods_leitura on public.training_methods for select using (true);
