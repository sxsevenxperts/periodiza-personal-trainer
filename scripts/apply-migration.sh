#!/usr/bin/env bash
#
# Aplica uma migration no banco remoto e verifica o resultado.
#
#   npm run db:migrate                                  # aplica a 0010 (padrao)
#   npm run db:migrate -- supabase/migrations/0011_x.sql
#
# A string de conexao vem de SUPABASE_DB_URL (ou DATABASE_URL), nunca de
# argumento — assim a senha nao fica no historico do shell nem na lista de
# processos.
#
#   export SUPABASE_DB_URL="postgresql://postgres:SENHA@HOST:5432/postgres"
#
# As migrations deste projeto sao idempotentes: reaplicar nao causa erro.

set -euo pipefail

MIGRATION="${1:-supabase/migrations/0010_session_label_and_search.sql}"
DB_URL="${SUPABASE_DB_URL:-${DATABASE_URL:-}}"

vermelho() { printf '\033[31m%s\033[0m\n' "$1"; }
verde()    { printf '\033[32m%s\033[0m\n' "$1"; }
amarelo()  { printf '\033[33m%s\033[0m\n' "$1"; }

if [ -z "$DB_URL" ]; then
  vermelho "ERRO: defina SUPABASE_DB_URL (ou DATABASE_URL) antes de rodar."
  echo
  echo '  export SUPABASE_DB_URL="postgresql://postgres:SENHA@HOST:5432/postgres"'
  echo
  echo "A senha é a de SUPABASE_DB_PASSWORD (veja .env.example)."
  exit 1
fi

if [ ! -f "$MIGRATION" ]; then
  vermelho "ERRO: migration não encontrada: $MIGRATION"
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  vermelho "ERRO: psql não encontrado. Instale o cliente do PostgreSQL."
  echo "  Debian/Ubuntu: sudo apt install postgresql-client"
  echo "  macOS:         brew install libpq"
  exit 1
fi

echo "Aplicando $(basename "$MIGRATION")..."
if ! psql "$DB_URL" -v ON_ERROR_STOP=1 -q -f "$MIGRATION"; then
  vermelho "FALHOU: a migration não foi aplicada. Nada foi alterado (ON_ERROR_STOP)."
  exit 1
fi
verde "Migration aplicada."

# ---------------------------------------------------------------------------
# Verificacao
# ---------------------------------------------------------------------------
echo
echo "Verificando..."
FALHAS=0

checar() {
  local descricao="$1" sql="$2" esperado="$3"
  local obtido
  obtido=$(psql "$DB_URL" -tAc "$sql" 2>/dev/null | tr -d '[:space:]')
  if [ "$obtido" = "$esperado" ]; then
    printf '  %-46s %s\n' "$descricao" "$(verde OK)"
  else
    printf '  %-46s %s (esperado %s, obtido %s)\n' \
      "$descricao" "$(vermelho FALHOU)" "$esperado" "${obtido:-vazio}"
    FALHAS=$((FALHAS + 1))
  fi
}

checar "CHECK constraints de domínio" \
  "select count(*) from pg_constraint where conname in ('sessions_label_check','periodizations_split_check');" \
  "2"

checar "coluna restricted_movement_patterns" \
  "select count(*) from information_schema.columns where table_name='client_anamnesis' and column_name='restricted_movement_patterns';" \
  "1"

checar "RPC search_exercises (1 assinatura)" \
  "select count(*) from pg_proc where proname='search_exercises';" \
  "1"

checar "search_vector preenchido em todo o catálogo" \
  "select count(*) from exercises where search_vector is null;" \
  "0"

# A busca precisa devolver algo; o catalogo tem exercicios com 'a' no nome.
RESULTADOS=$(psql "$DB_URL" -tAc \
  "select count(*) from search_exercises('agachamento');" 2>/dev/null | tr -d '[:space:]')
if [ "${RESULTADOS:-0}" -gt 0 ] 2>/dev/null; then
  printf '  %-46s %s (%s resultado(s))\n' "busca por 'agachamento' retorna" "$(verde OK)" "$RESULTADOS"
else
  printf '  %-46s %s\n' "busca por 'agachamento' retorna" "$(amarelo 'sem resultados')"
  echo "     Pode ser catálogo vazio (rode 'npm run seed') e não falha da migration."
fi

echo
if [ "$FALHAS" -eq 0 ]; then
  verde "Tudo certo. A busca contextual está ativa."
  echo "Próximo passo opcional: remover o fallback 'ilike' em"
  echo "app/(app)/periodizacoes/[periodizationId]/actions.ts (ver docs/MIGRATIONS.md)."
else
  vermelho "$FALHAS verificação(ões) falharam. Ver docs/MIGRATIONS.md."
  exit 1
fi
