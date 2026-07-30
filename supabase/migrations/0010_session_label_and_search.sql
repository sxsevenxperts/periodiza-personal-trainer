-- 0010_session_label_and_search.sql
-- Reforça o dominio de sessions.label (A-G) e periodizations.split, e entrega
-- a busca full-text de exercicios (search_vector + RPC search_exercises).
--
-- IMPORTANTE — o que JA existe nas migrations anteriores e NAO e recriado aqui:
--   * sessions.label ................ 0005 (text not null)
--   * unique (microcycle_id, label) .. 0005
--   * periodizations.split .......... 0005 (text default 'ABC')
--   * exercises.search_vector ....... 0004 (tsvector)
--   * exercises_search_gin .......... 0004 (gin em search_vector)
--   * exercises_name_trgm ........... 0004 (gin em name_pt, gin_trgm_ops)
--   * unaccent / pg_trgm ............ 0001 (schema "extensions")
-- Esta migration apenas adiciona o que falta e e idempotente.

-- ---------------------------------------------------------------------------
-- 1. Dominio de sessions.label (A-G) e periodizations.split
-- ---------------------------------------------------------------------------
-- As colunas ja existem como text. Em vez de converter para enum (reescreve a
-- tabela e quebra dados fora do dominio), aplicamos CHECK constraints, que
-- entregam a mesma garantia com custo e risco menores.

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'sessions_label_check'
  ) then
    alter table sessions
      add constraint sessions_label_check
      check (label in ('A','B','C','D','E','F','G'));
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'periodizations_split_check'
  ) then
    alter table periodizations
      add constraint periodizations_split_check
      check (split in ('A','AB','ABC','ABCD','ABCDE','ABCDEF','ABCDEFG'));
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- 2. Padroes de movimento restritos na anamnese
-- ---------------------------------------------------------------------------
-- Necessario para a anotacao contextual "restrito" no resultado da busca.
-- A UI de anamnese que popula esta coluna faz parte da Fase 4.
alter table client_anamnesis
  add column if not exists restricted_movement_patterns text[] not null default '{}';

comment on column client_anamnesis.restricted_movement_patterns is
  'Slugs de movement_patterns contraindicados para o aluno. Alimenta a anotacao "restrito" em search_exercises().';

-- ---------------------------------------------------------------------------
-- 3. search_vector: trigger + backfill
-- ---------------------------------------------------------------------------
-- unaccent() e schema-qualificado porque a extensao vive em "extensions" e o
-- search_path da funcao nao inclui esse schema.
create or replace function update_exercises_search_vector()
returns trigger as $$
begin
  new.search_vector :=
      setweight(to_tsvector('portuguese', extensions.unaccent(coalesce(new.name_pt, ''))), 'A')
   || setweight(to_tsvector('portuguese', extensions.unaccent(coalesce(array_to_string(new.aliases_pt, ' '), ''))), 'B')
   || setweight(to_tsvector('portuguese', extensions.unaccent(coalesce(new.name_en, ''))), 'C')
   || setweight(to_tsvector('portuguese', extensions.unaccent(coalesce(
        (select m.name_pt from muscles m where m.id = new.primary_muscle_id), ''
      ))), 'D');
  return new;
end;
$$ language plpgsql;

comment on function update_exercises_search_vector is
  'Mantem exercises.search_vector. Aplica unaccent para que "gluteo" encontre "gluteo" com acento.';

drop trigger if exists update_exercises_search_vector_trigger on exercises;
create trigger update_exercises_search_vector_trigger
  before insert or update of name_pt, name_en, aliases_pt, primary_muscle_id
  on exercises
  for each row
  execute function update_exercises_search_vector();

-- Backfill: o trigger so dispara em insert/update, logo as linhas ja existentes
-- ficariam com search_vector nulo e a busca nao retornaria nada.
-- "set name_pt = name_pt" e intencional: satisfaz o "update of name_pt" do
-- trigger (que olha as colunas citadas no SET, nao se o valor mudou).
update exercises set name_pt = name_pt where search_vector is null;

-- ---------------------------------------------------------------------------
-- 4. RPC search_exercises
-- ---------------------------------------------------------------------------
-- Assinatura anterior removida explicitamente: os nomes dos parametros mudaram
-- (prefixo p_) e "create or replace" nao substitui uma funcao com outra
-- assinatura, deixaria duas versoes coexistindo.
drop function if exists search_exercises(text, text, text, text, text, uuid);
drop function if exists search_exercises(text, text, text, text, text, uuid, uuid, integer);

-- security INVOKER (padrao, nao DEFINER): a funcao le anamnese e equipamentos
-- do aluno, entao precisa herdar as permissoes de quem chama. O join
-- obrigatorio em clients (que tem RLS) garante que um personal nao consegue
-- ler o contexto de um aluno de outra organizacao passando um client_id
-- arbitrario — sem a linha em clients, as anotacoes saem como false.
create or replace function search_exercises(
  p_query          text default '',
  p_category       text default null,
  p_movement       text default null,
  p_muscle_id      uuid default null,
  p_equipment      text default null,
  p_client_id      uuid default null,
  p_microcycle_id  uuid default null,
  p_limit          integer default 50
)
returns table (
  out_exercise_id          uuid,
  out_name_pt              text,
  out_name_en              text,
  out_aliases_pt           text[],
  out_primary_muscle       text,
  out_movement_pattern     text,
  out_equipment            text[],
  out_technical_level      text,
  out_has_restriction      boolean,
  out_missing_equipment    boolean,
  out_already_prescribed   boolean,
  out_weekly_volume_series integer
) as $$
declare
  v_termo  text    := extensions.unaccent(coalesce(trim(p_query), ''));
  v_query  tsquery := case
                        when v_termo = '' then null
                        else plainto_tsquery('portuguese', v_termo)
                      end;
begin
  return query
  select
    e.id,
    e.name_pt,
    e.name_en,
    e.aliases_pt,
    mus.name_pt,
    mp.name_pt,
    e.equipment_slugs,
    e.technical_level,
    -- restrito: padrao de movimento contraindicado na anamnese
    coalesce(mp.slug = any (ca.restricted_movement_patterns), false),
    -- sem equipamento: o aluno nao tem todo o equipamento exigido
    case
      when cea.client_id is null then false
      when coalesce(array_length(e.equipment_slugs, 1), 0) = 0 then false
      else not (cea.available_equipment_slugs @> e.equipment_slugs)
    end,
    -- ja prescrito: exercicio presente em outra sessao do mesmo microciclo
    case
      when p_microcycle_id is null then false
      else exists (
        select 1
        from prescription_items pi
        join sessions s on s.id = pi.session_id
        where s.microcycle_id = p_microcycle_id
          and pi.exercise_id = e.id
      )
    end,
    -- volume semanal por grupo muscular: agregacao pendente (Fase 4)
    0
  from exercises e
  left join movement_patterns mp on mp.id = e.movement_pattern_id
  left join muscles          mus on mus.id = e.primary_muscle_id
  -- clients entra para que o RLS filtre o contexto do aluno
  left join clients                c   on c.id = p_client_id
  left join client_anamnesis       ca  on ca.client_id = c.id
  left join client_equipment_access cea on cea.client_id = c.id
  where
    e.is_active is true
    and (
      v_query is null
      or e.search_vector @@ v_query
      -- tolerancia a erro de digitacao ("agacahmento" -> "Agachamento")
      or extensions.similarity(extensions.unaccent(e.name_pt), v_termo) > 0.3
    )
    and (p_category  is null or e.catalog_group = p_category)
    and (p_movement  is null or mp.slug = p_movement)
    and (p_muscle_id is null or e.primary_muscle_id = p_muscle_id)
    and (p_equipment is null or e.equipment_slugs @> array[p_equipment])
  order by
    case when v_query is null then 0 else ts_rank(e.search_vector, v_query) end desc,
    e.name_pt asc
  limit greatest(coalesce(p_limit, 50), 1);
end;
$$ language plpgsql stable set search_path = public, extensions;

comment on function search_exercises is
  'Busca full-text de exercicios (unaccent + trigram) com filtros e contexto do aluno. Anotacoes: restrito, sem equipamento, ja prescrito. Volume semanal ainda retorna 0 (Fase 4).';
