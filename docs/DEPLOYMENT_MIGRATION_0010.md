# Deployment Guide — Migration 0010: Session Label + Full-Text Search

**Status:** 🔴 CRÍTICA — Bloqueador para funcionar em produção

## Pré-requisitos

- ✅ Migration 0010 criada: `supabase/migrations/0010_session_label_and_search.sql`
- ✅ Código do builder pronto: `components/builder/workout-builder.tsx`
- ✅ Actions prontas: `app/actions/exercise-actions.ts`
- ⏳ Migration **NÃO APLICADA** no Supabase EasyPanel ainda

## Ambiente de Deployment

```
Provedor: Supabase EasyPanel
Host: xpert-backend-supabase.qfotry.easypanel.host
Banco: postgres (database principal)
Usuário: [credenciais do admin]
```

## Opção 1: Via psql (Recomendado)

### 1.1 Obter Credenciais

No painel EasyPanel:
1. Navegar para Supabase → Configurações
2. Procurar por "Conexão do Banco de Dados"
3. Copiar connection string:
   ```
   postgresql://[user]:[password]@xpert-backend-supabase.qfotry.easypanel.host/postgres
   ```

### 1.2 Executar Migration

**Na máquina local (ou via tunnel):**

```bash
# 1. Verificar se psql está instalado
psql --version

# 2. Conectar e executar a migration
psql "postgresql://[user]:[password]@xpert-backend-supabase.qfotry.easypanel.host/postgres" \
  -f supabase/migrations/0010_session_label_and_search.sql

# Esperado: Mensagens de sucesso para cada comando
```

**Exemplo de saída esperada:**

```sql
CREATE EXTENSION
CREATE TYPE
CREATE TABLE
CREATE INDEX
CREATE FUNCTION
CREATE TRIGGER
```

### 1.3 Validar

```bash
# Verificar que o enum session_label foi criado
psql "postgresql://..." \
  -c "SELECT typname FROM pg_type WHERE typname = 'session_label';"

# Esperado: session_label

# Verificar que a coluna sessions.label existe
psql "postgresql://..." \
  -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'sessions';"

# Esperado: label (entre outras colunas)

# Verificar que o trigger foi criado
psql "postgresql://..." \
  -c "SELECT trigger_name FROM information_schema.triggers WHERE trigger_name ILIKE '%search%';"

# Esperado: update_exercises_search_vector_trigger

# Verificar que o RPC search_exercises foi criado
psql "postgresql://..." \
  -c "SELECT routine_name FROM information_schema.routines WHERE routine_name = 'search_exercises';"

# Esperado: search_exercises
```

---

## Opção 2: Via Supabase Admin API (Alternativa)

Se não conseguir acesso via psql, usar a Admin API:

### 2.1 Obter API Key

No painel EasyPanel:
1. Supabase → Configurações → API
2. Copiar chave "Anon" ou "Service Role"

### 2.2 Executar Migration via Script

**Script: `scripts/apply-migration-0010.js`**

```javascript
const fs = require('fs')

const SUPABASE_URL = 'https://xpert-backend-supabase.qfotry.easypanel.host'
const SERVICE_ROLE_KEY = 'eyJ...' // Copiar do painel

const migrationSQL = fs.readFileSync(
  'supabase/migrations/0010_session_label_and_search.sql',
  'utf-8'
)

async function applyMigration() {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql: migrationSQL }),
  })

  if (!response.ok) {
    console.error('Erro ao aplicar migration:', response.statusText)
    const error = await response.text()
    console.error(error)
    process.exit(1)
  }

  console.log('✅ Migration 0010 aplicada com sucesso!')
}

applyMigration()
```

**Executar:**

```bash
node scripts/apply-migration-0010.js
```

---

## Opção 3: Via SQL Editor do Supabase Dashboard

### 3.1 Abrir Dashboard

1. Ir para: `https://app.supabase.com/` (ou `https://xpert-backend-supabase.qfotry.easypanel.host/dashboard`)
2. Fazer login com credenciais

### 3.2 Copiar e Colar SQL

1. SQL Editor → New Query
2. Copiar conteúdo de `supabase/migrations/0010_session_label_and_search.sql`
3. Colar na query
4. Clicar "Execute"

**⚠️ Aviso:** Se o arquivo for muito grande, pode precisar quebrar em múltiplas queries.

---

## Pós-Deployment

### 3.1 Testar RPC

**Via CLI local:**

```bash
# Usar a CLI Supabase
supabase functions test --no-verify

# Ou testar via curl:
curl -X POST "https://xpert-backend-supabase.qfotry.easypanel.host/rest/v1/rpc/search_exercises" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query_text": "agachamento",
    "category_filter": null,
    "movement_filter": null,
    "muscle_filter": null,
    "equipment_filter": null,
    "client_id": null
  }'
```

**Esperado:**

```json
[
  {
    "id": "...",
    "name_pt": "Agachamento",
    "name_en": "Squat",
    "notes": ["🔵 Já prescrito em A"]
  }
]
```

### 3.2 Rodar Testes E2E

```bash
npm run test:e2e:treino-builder
```

Ver: `docs/E2E_TESTS_TREINO_BUILDER.md`

### 3.3 Verificar Logs

**No painel EasyPanel:**
1. Supabase → Logs
2. Procurar por erros de `search_exercises`
3. Confirmar que não há erros de permissão (RLS)

---

## Troubleshooting

### ❌ Erro: "Extension pgcrypto does not exist"

```
ERROR: extension "pgcrypto" does not exist
```

**Solução:** Já deve estar criada pela migração 0001. Se não:

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

---

### ❌ Erro: "Extension pg_trgm does not exist"

```
ERROR: extension "pg_trgm" does not exist
```

**Solução:** Criar manualmente:

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

---

### ❌ Erro: "Type session_label does not exist"

```
ERROR: type "session_label" does not exist
```

**Solução:** Migration foi interrompida. Verificar:

```sql
SELECT typname FROM pg_type WHERE typname = 'session_label';
-- Se não retornar nada, a migration não foi aplicada completamente
```

**Remediar:** Executar migration novamente (idempotente com IF NOT EXISTS)

---

### ❌ Erro: "RPC search_exercises not found"

```
404 Not Found: function search_exercises not found
```

**Solução:** Verificar se RPC foi criado:

```sql
SELECT routine_name, routine_type FROM information_schema.routines 
WHERE routine_schema = 'public' AND routine_name = 'search_exercises';
```

Se não aparecer, re-executar a migration.

---

### ❌ Erro: "Permission denied for schema public"

```
ERROR: permission denied for schema public
```

**Solução:** Usar credenciais do admin (não anon key). Verificar que:
- User é `postgres` (superuser) ou role com grants necessários
- Não usar `SECURITY INVOKER` se as credenciais forem restritas

---

## Verificação Final (Checklist)

- [ ] psql/curl retorna sucesso (sem erros)
- [ ] `SELECT column_name ... 'sessions'` mostra coluna `label`
- [ ] `SELECT routine_name ... 'search_exercises'` existe
- [ ] Teste E2E "Buscar Exercício por Nome" passa
- [ ] Teste E2E "Buscar com Alias" passa (se seed de aliases feito)
- [ ] Teste E2E "Buscar com Trigram" passa
- [ ] Builder page carrega sem erros 500
- [ ] Toast "Exercício adicionado" aparece quando clica + Adicionar
- [ ] Aba mostra contagem correta de exercícios

---

## Rollback (Se Necessário)

Se algo der errado e precisar fazer rollback:

### Opção A: Deletar dados de teste e re-aplicar

```sql
-- CUIDADO: Deletar dados de teste apenas
DELETE FROM prescription_items WHERE session_id IN (
  SELECT id FROM sessions WHERE label IS NOT NULL
);

-- Dropar estruturas se necessário (perdará dados)
DROP TRIGGER IF EXISTS update_exercises_search_vector_trigger ON exercises;
DROP FUNCTION IF EXISTS update_exercises_search_vector() CASCADE;
DROP FUNCTION IF EXISTS search_exercises(...) CASCADE;
DROP FUNCTION IF EXISTS update_exercises_search_vector() CASCADE;
DROP TYPE IF EXISTS session_label CASCADE;
DROP TYPE IF EXISTS training_split CASCADE;
```

### Opção B: Restaurar backup

Se o banco tem backup automático:
1. Painel EasyPanel → Backups
2. Restaurar snapshot anterior a 2026-07-30

---

## Documentação Associada

- Migration SQL: `supabase/migrations/0010_session_label_and_search.sql`
- Builder Component: `components/builder/workout-builder.tsx`
- Actions: `app/actions/exercise-actions.ts`
- Testes E2E: `docs/E2E_TESTS_TREINO_BUILDER.md`
- ROADMAP: `docs/ROADMAP.md` (Fase 3 — Etapa 1)

---

**Última atualização:** 2026-07-30  
**Responsável:** DevOps / DBA  
**Aprovação:** Necessária antes de aplicar em produção
