-- 0009_functions_views_triggers.sql

-- Trigger: updated_at
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_clients_updated_at before update on clients for each row execute function set_updated_at();
create trigger update_client_anamnesis_updated_at before update on client_anamnesis for each row execute function set_updated_at();
create trigger update_client_equipment_updated_at before update on client_equipment_access for each row execute function set_updated_at();
create trigger update_exercises_updated_at before update on exercises for each row execute function set_updated_at();
create trigger update_periodizations_updated_at before update on periodizations for each row execute function set_updated_at();
create trigger update_sessions_updated_at before update on sessions for each row execute function set_updated_at();
create trigger update_prescription_items_updated_at before update on prescription_items for each row execute function set_updated_at();
create trigger update_workout_executions_updated_at before update on workout_executions for each row execute function set_updated_at();

-- Funcao: current_user_role
create or replace function current_user_role() returns text as $$
  select role from profiles where id = auth.uid();
$$ language sql stable security definer set search_path = public;

-- Funcao: estimate_1rm (Epley)
create or replace function estimate_1rm(load numeric, reps integer)
returns numeric as $$
begin
  if reps = 0 then return load; end if;
  return round(load * (1 + reps::numeric / 30), 2);
end;
$$ language plpgsql immutable;

-- View: periodizations vencendo
create or replace view v_periodizations_expiring as
  select id, name, client_id, end_date, (end_date - current_date) as dias_restantes
  from periodizations
  where status = 'ativa' and end_date between current_date and (current_date + interval '14 days');
