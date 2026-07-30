-- 0008_rls_policies.sql
-- RLS habilitado em todas as tabelas de negocio

alter table organizations enable row level security;
alter table profiles enable row level security;
alter table clients enable row level security;
alter table periodizations enable row level security;
alter table sessions enable row level security;
alter table prescription_items enable row level security;
alter table workout_executions enable row level security;
alter table set_logs enable row level security;

-- Catalogo global: READ para todos, WRITE para service_role
alter table exercises enable row level security;
alter table exercise_variants enable row level security;

create policy "exercises_read_all" on exercises for select using (true);
create policy "exercise_variants_read_all" on exercise_variants for select using (true);

-- Personal vê clientes da sua organization
create policy "clients_personal_view" on clients
  for select
  using (
    auth.uid() = personal_id
    or (current_user_role() = 'personal' and organization_id in (
      select organization_id from organization_members where member_id = auth.uid()
    ))
  );

-- Cliente vê apenas seus dados
create policy "clients_self_view" on clients
  for select
  using (profile_id = auth.uid());

-- Periodizacoes: personal acessa, cliente vê apenas ativas
create policy "periodizations_personal_view" on periodizations
  for select
  using (
    created_by = auth.uid()
    or (status = 'ativa' and client_id in (select id from clients where profile_id = auth.uid()))
  );

-- Sessoes: acesso via periodization
create policy "sessions_via_periodization" on sessions
  for select
  using (
    microcycle_id in (
      select id from microcycles where mesocycle_id in (
        select id from mesocycles where periodization_id in (
          select id from periodizations where created_by = auth.uid()
          or (status = 'ativa' and client_id in (select id from clients where profile_id = auth.uid()))
        )
      )
    )
  );

-- Execucoes: cliente vê e registra apenas suas
create policy "workout_executions_client_self" on workout_executions
  for select
  using (client_id in (select id from clients where profile_id = auth.uid()));

create policy "workout_executions_client_insert" on workout_executions
  for insert
  with check (client_id in (select id from clients where profile_id = auth.uid()));
