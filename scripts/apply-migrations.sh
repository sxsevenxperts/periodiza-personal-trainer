#!/bin/bash
set -e

SUPABASE_URL="https://xpert-backend-supabase.qfotry.easypanel.host"
SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q"

echo "📊 Applying migrations to Supabase EasyPanel..."
echo "🔗 URL: $SUPABASE_URL"

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

for mig in "${MIGRATIONS[@]}"; do
  if [ -f "$mig" ]; then
    echo "⏳ Applying $mig..."
    SQL=$(cat "$mig" | jq -sR .)
    
    # Via Supabase SQL API
    PAYLOAD="{\"query\": $SQL}"
    
    RESPONSE=$(curl -s -X POST "$SUPABASE_URL/rest/v1/rpc/execute_sql" \
      -H "Authorization: Bearer $SERVICE_KEY" \
      -H "Content-Type: application/json" \
      -H "Prefer: return=representation" \
      -d "$PAYLOAD" 2>&1)
    
    if echo "$RESPONSE" | grep -q "error"; then
      echo "❌ Error applying $mig:"
      echo "$RESPONSE" | head -20
    else
      echo "✅ $mig applied"
    fi
  else
    echo "⚠️  $mig not found"
  fi
done

echo "Done!"
