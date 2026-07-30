# Aplicar Migration 0010 no Supabase EasyPanel

## Status

| Item | Status |
|---|---|
| Migration SQL criada | ✅ `supabase/migrations/0010_session_label_and_search.sql` |
| Catálogo completo (454 ex) | ✅ `data/catalog.json` |
| Aplicada no Supabase | ⏳ **PENDENTE** |

## O que esta migration faz

### 1. Session labels (A–G)
```sql
create type session_label_enum as enum ('A', 'B', 'C', 'D', 'E', 'F', 'G');
alter table sessions add column label session_label_enum not null default 'A';
create unique index sessions_microcycle_label_uniq on sessions (microcycle_id, label);
```

**Resultado**: Cada sessão é identificada por uma letra (A–G), não por nome. Permite comparar evolução do mesmo treino entre semanas.

### 2. Training split
```sql
create type training_split_enum as enum ('A', 'AB', 'ABC', 'ABCD', 'ABCDE', 'ABCDEF', 'ABCDEFG');
alter table periodizations add column split training_split_enum not null default 'ABC';
```

**Resultado**: A divisão define quantas abas (A, AB, ABC...) o builder oferece. Padrão é ABC (3 treinos por semana).

### 3. Full-text search com português
```sql
alter table exercises add column search_vector tsvector;

create or replace function update_exercises_search_vector()
  returns trigger as $$
  begin
    new.search_vector := (
      setweight(to_tsvector('portuguese', coalesce(new.name_pt, '')), 'A') ||
      setweight(to_tsvector('portuguese', coalesce(array_to_string(new.aliases_pt, ' '), '')), 'B') ||
      ...
    );
    return new;
  end;
  $$ language plpgsql;

create trigger update_exercises_search_vector_trigger
  before insert or update on exercises for each row
  execute function update_exercises_search_vector();

create index exercises_search_vector_idx on exercises using gin (search_vector);
create index exercises_name_pt_trgm_idx on exercises using gin (name_pt gin_trgm_ops);
```

**Resultado**: 
- Busca em português (com dicionário)
- Busca sem acento: "gluteo" → "Glúteo máximo"
- Busca tolerante a erro: "agacahmento" → "Agachamento"
- Busca por alias: "hip thrust" → "Elevação pelvica"

### 4. RPC search_exercises()
```sql
create or replace function search_exercises(
  query_text text default '',
  category_filter text default null,
  movement_filter text default null,
  muscle_filter text default null,
  equipment_filter text default null,
  client_id uuid default null
)
returns table (
  exercise_id uuid,
  name_pt text,
  name_en text,
  primary_muscle text,
  movement_pattern text,
  equipment text[],
  technical_level text,
  has_restriction boolean,          -- 🔴 padrão restrito na anamnese
  missing_equipment boolean,        -- 🟡 sem equipamento disponível
  already_prescribed boolean,       -- 🔵 já prescrito neste microciclo
  weekly_volume_series integer      -- ⚪ séries semanais do grupo muscular
) as $$
...
```

**Resultado**: Busca inteligente que retorna anotações contextuais para o aluno.

---

## Como aplicar

### Opção 1: Via psql (recomendado)

```bash
psql -h xpert-backend-supabasegeral.qfotry.easypanel.host \
     -U postgres \
     -d postgres \
     -W \
     < supabase/migrations/0010_session_label_and_search.sql
```

Será pedida a senha do banco (`SUPABASE_DB_PASSWORD` do `.env.local`).

**Esperado**: 
- Sem erros
- Saída final: `CREATE FUNCTION`

### Opção 2: Via Supabase CLI

```bash
# Validar primeiro
supabase db push --dry-run

# Aplicar
supabase db push
```

Requer `.env.local` com credenciais preenchidas.

### Opção 3: Via SQL Editor do Dashboard

1. Abrir https://xpert-backend-supabasegeral.qfotry.easypanel.host/project/default
2. Menu → SQL Editor → New query
3. Copiar conteúdo de `supabase/migrations/0010_session_label_and_search.sql`
4. Executar

---

## Validação após aplicação

Copiar e executar no SQL Editor:

```sql
-- 1. Verificar enums
SELECT typname FROM pg_type 
WHERE typname IN ('session_label_enum', 'training_split_enum');
-- Esperado: 2 linhas

-- 2. Verificar colunas em sessions e periodizations
SELECT column_name FROM information_schema.columns 
WHERE table_name='sessions' AND column_name='label';

SELECT column_name FROM information_schema.columns 
WHERE table_name='periodizations' AND column_name='split';
-- Esperado: 2 linhas

-- 3. Verificar RPC search_exercises
SELECT routine_name FROM information_schema.routines 
WHERE routine_name='search_exercises';
-- Esperado: 1 linha

-- 4. Testar RPC
SELECT exercise_id, name_pt, name_en 
FROM search_exercises(query_text := 'agachamento', category_filter := NULL)
LIMIT 5;
-- Esperado: exercícios contendo "agachamento"

-- 5. Testar trigram (sem acento)
SELECT exercise_id, name_pt 
FROM search_exercises(query_text := 'gluteo')
LIMIT 5;
-- Esperado: exercícios com "glúteo" (matching sem acento)

-- 6. Testar por alias
SELECT exercise_id, name_pt 
FROM search_exercises(query_text := 'hip thrust')
LIMIT 5;
-- Esperado: "Elevação pelvica com barra" ou similar (alias match)
```

---

## Bloqueadores se não aplicada

| Componente | Impacto |
|---|---|
| Builder (abas A–G) | ❌ RPC `search_exercises` não existe → erro de connexão |
| Busca de exercícios | ❌ Retorna erro, fallback a `ilike` (degradado) |
| Adicionar exercício | ❌ Falha ao salvar se tentar usar contexto (restrição, equipamento) |
| Filtros contextuais | ❌ Anotações 🔴 🟡 🔵 ⚪ não funcionam |

---

## Próximos passos após aplicar

1. ✅ Seed catálogo (454 exercícios)
   ```bash
   npm run seed
   ```

2. ✅ Testes: buscar "hip thrust" → "Elevação pelvica"

3. ✅ Integrar Builder com página de periodização

4. ✅ Testes E2E completos

---

## Troubleshooting

**Erro: "function update_exercises_search_vector_trigger does not exist"**
- Cause: Trigger não pode chamar função que não existe ainda
- Fix: Executar a migration completa, não em partes

**Erro: "type session_label_enum does not exist"**
- Cause: Enums não foram criados em 0001 ou foram dropados
- Fix: Verificar que migration 0001 está aplicada e não foi dropada

**RPC retorna 0 linhas mesmo para busca válida**
- Cause: `exercises` está vazia (catálogo não foi seedado)
- Fix: Executar seed após migration

**"permission denied" ao executar RPC**
- Cause: Role do usuário não tem `execute` permission
- Fix: Verificar RLS policies de `exercises`

---

**Última atualização**: 2026-07-30  
**Commit**: `4eb4216` (complete exercise catalog)  
**Migration**: `0010_session_label_and_search.sql`
