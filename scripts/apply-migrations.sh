#!/bin/bash
set -euo pipefail

# ============================================================
# apply-migrations.sh
# Aplica migrations SQL no Supabase via pg-meta query API
# Uso: ./scripts/apply-migrations.sh
# Requer: .env.local com NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Carrega variáveis de .env.local
if [ -f "$PROJECT_DIR/.env.local" ]; then
  set -a
  source "$PROJECT_DIR/.env.local"
  set +a
else
  echo "❌ .env.local não encontrado em $PROJECT_DIR"
  exit 1
fi

SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:?Variável NEXT_PUBLIC_SUPABASE_URL não definida}"
SERVICE_KEY="${SUPABASE_SERVICE_ROLE_KEY:?Variável SUPABASE_SERVICE_ROLE_KEY não definida}"

echo "📊 Aplicando migrations no Supabase..."
echo "🔗 URL: $SUPABASE_URL"
echo ""

MIGRATIONS=(
  "supabase/migrations/0001_extensions_and_enums.sql"
  "supabase/migrations/0002_identity_and_tenancy.sql"
  "supabase/migrations/0003_clients_and_assessment.sql"
  "supabase/migrations/0004_exercise_catalog.sql"
  "supabase/migrations/0005_periodization.sql"
  "supabase/migrations/0006_prescription.sql"
  "supabase/migrations/0007_execution_and_logs.sql"
  "supabase/migrations/0008_rls_policies.sql"
  "supabase/migrations/0009_functions_views_triggers.sql"
)

SUCCESS=0
FAIL=0

for mig in "${MIGRATIONS[@]}"; do
  MIG_PATH="$PROJECT_DIR/$mig"
  if [ ! -f "$MIG_PATH" ]; then
    echo "⚠️  $mig não encontrado"
    ((FAIL++))
    continue
  fi

  echo "⏳ Aplicando $mig..."

  # Usa Python para escapar o SQL como JSON e enviar via curl
  RESPONSE=$(python3 -c "
import json, subprocess, sys

with open('$MIG_PATH', 'r') as f:
    sql = f.read()

payload = json.dumps({'query': sql})

result = subprocess.run([
    'curl', '-s', '-X', 'POST',
    '$SUPABASE_URL/pg/query',
    '-H', 'apikey: $SERVICE_KEY',
    '-H', 'Authorization: Bearer $SERVICE_KEY',
    '-H', 'Content-Type: application/json',
    '-d', payload
], capture_output=True, text=True)

print(result.stdout)
if result.returncode != 0:
    print(result.stderr, file=sys.stderr)
    sys.exit(1)
" 2>&1)

  # Verifica se houve erro
  if echo "$RESPONSE" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if isinstance(data, dict) and ('error' in data or 'message' in data):
        print(data.get('error', data.get('message', 'Unknown error')))
        sys.exit(1)
    sys.exit(0)
except:
    sys.exit(0)
" 2>/dev/null; then
    echo "✅ $mig aplicado com sucesso"
    ((SUCCESS++))
  else
    echo "❌ Erro ao aplicar $mig:"
    echo "$RESPONSE" | head -5
    ((FAIL++))
  fi
done

echo ""
echo "========================================="
echo "✅ Sucesso: $SUCCESS | ❌ Falhas: $FAIL"
echo "========================================="

if [ $FAIL -gt 0 ]; then
  exit 1
fi
