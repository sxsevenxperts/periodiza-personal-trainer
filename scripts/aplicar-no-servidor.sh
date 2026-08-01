#!/usr/bin/env bash
#
# Aplica as migrations pendentes (0010, 0011, 0012) no Supabase auto-hospedado
# e verifica o resultado de cada uma.
#
#   bash scripts/aplicar-no-servidor.sh
#
# MODOS
#
#   1. docker (padrao) — roda NO SERVIDOR onde a stack do Supabase esta.
#      Descobre o container do Postgres sozinho.
#
#   2. conexao direta — quando a porta 5432 esta acessivel:
#      export SUPABASE_DB_URL="postgresql://postgres:SENHA@HOST:5432/postgres"
#
# A senha vem sempre do ambiente, nunca de argumento, para nao ficar no
# historico do shell nem visivel na lista de processos.
#
# A ORDEM IMPORTA: 0011 escreve policies em `public.*` e a 0012 move tudo para o
# schema `periodiza`. Rodar 0011 depois da 0012 falha (sem estragar nada, mas e
# retrabalho). O script aplica na ordem correta.
#
# A 0012 MOVE DADOS. O script exige um backup antes — veja --pular-backup.

set -euo pipefail

cd "$(dirname "$0")/.."

SCHEMA="${SUPABASE_SCHEMA:-periodiza}"
DIR_BACKUP="${DIR_BACKUP:-./backups}"
PULAR_BACKUP=0
CONTAINER_DB="${CONTAINER_DB:-}"

MIGRATIONS=(
  "supabase/migrations/0010_session_label_and_search.sql"
  "supabase/migrations/0011_rls_completo.sql"
  "supabase/migrations/0012_schema_do_projeto.sql"
)

vermelho() { printf '\033[31m%s\033[0m\n' "$1"; }
verde()    { printf '\033[32m%s\033[0m\n' "$1"; }
amarelo()  { printf '\033[33m%s\033[0m\n' "$1"; }
titulo()   { printf '\n\033[1m%s\033[0m\n' "$1"; }

for arg in "$@"; do
  case "$arg" in
    --pular-backup) PULAR_BACKUP=1 ;;
    -h|--help) sed -n '2,26p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) vermelho "Argumento desconhecido: $arg"; exit 1 ;;
  esac
done

# ---------------------------------------------------------------------------
# Como falar com o banco
# ---------------------------------------------------------------------------
if [ -n "${SUPABASE_DB_URL:-}" ]; then
  MODO="conexao direta"
  command -v psql >/dev/null 2>&1 || {
    vermelho "ERRO: psql nao encontrado. Instale o cliente do PostgreSQL."
    exit 1
  }
  rodar_sql()  { psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -q "$@"; }
  consultar()  { psql "$SUPABASE_DB_URL" -tAq -c "$1" 2>/dev/null | tr -d '[:space:]'; }
  despejar()   { pg_dump "$SUPABASE_DB_URL"; }
else
  MODO="docker"

  # Nao basta o binario existir: sem daemon acessivel, cada `docker ps` cospe um
  # erro de socket que esconde a mensagem util.
  if ! command -v docker >/dev/null 2>&1 || ! docker info >/dev/null 2>&1; then
    vermelho "ERRO: nao consigo falar com o Docker, e SUPABASE_DB_URL nao esta definida."
    echo
    if command -v docker >/dev/null 2>&1; then
      echo "  O comando docker existe, mas o daemon nao respondeu."
      echo "  Se voce nao esta no servidor da stack, use a conexao direta:"
    else
      echo "  Rode este script NO SERVIDOR onde a stack do Supabase esta, ou:"
    fi
    echo
    echo '    export SUPABASE_DB_URL="postgresql://postgres:SENHA@HOST:5432/postgres"'
    echo "    bash scripts/aplicar-no-servidor.sh"
    exit 1
  fi

  if [ -z "$CONTAINER_DB" ]; then
    # O container do Postgres da stack do Supabase. Filtra por imagem para nao
    # pegar o Postgres de outro projeto que rode no mesmo servidor.
    CONTAINER_DB=$(docker ps --format '{{.Names}}\t{{.Image}}' \
      | grep -Ei 'supabase/postgres|postgres' \
      | grep -Ei 'supabase' \
      | head -1 | cut -f1 || true)
  fi

  if [ -z "$CONTAINER_DB" ]; then
    vermelho "ERRO: nao encontrei o container do Postgres do Supabase."
    echo
    echo "Containers em execucao:"
    docker ps --format '  {{.Names}}  ({{.Image}})'
    echo
    echo "Informe o nome manualmente:"
    echo "  CONTAINER_DB=<nome> bash scripts/aplicar-no-servidor.sh"
    exit 1
  fi

  rodar_sql() { docker exec -i "$CONTAINER_DB" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q "$@"; }
  consultar() { docker exec -i "$CONTAINER_DB" psql -U postgres -d postgres -tAq -c "$1" 2>/dev/null | tr -d '[:space:]'; }
  despejar()  { docker exec -i "$CONTAINER_DB" pg_dump -U postgres -d postgres; }
fi

titulo "Periodiza — aplicar migrations no Supabase"
echo "  modo:   $MODO${CONTAINER_DB:+ (container: $CONTAINER_DB)}"
echo "  schema: $SCHEMA"

# ---------------------------------------------------------------------------
# Pre-checagens
# ---------------------------------------------------------------------------
titulo "Verificando acesso ao banco"
if ! consultar "select 1" >/dev/null 2>&1; then
  vermelho "ERRO: nao consegui consultar o banco."
  exit 1
fi
verde "  conexao OK ($(consultar "select current_setting('server_version')"))"

for m in "${MIGRATIONS[@]}"; do
  [ -f "$m" ] || { vermelho "ERRO: migration nao encontrada: $m"; exit 1; }
done
verde "  as ${#MIGRATIONS[@]} migrations estao presentes"

# ---------------------------------------------------------------------------
# Ja foi aplicado?
#
# Depois que a 0012 roda, as tabelas saem do `public`. As migrations 0010 e 0011
# referenciam `public.*`, entao reexecuta-las falharia — nao por estarem
# erradas, mas porque o alvo mudou de lugar. Em vez de deixar o script quebrar
# na segunda execucao, detectamos o estado final e pulamos direto para a
# verificacao. Assim rodar de novo e seguro e continua sendo util.
# ---------------------------------------------------------------------------
JA_APLICADO=$(consultar "select count(*) from pg_class c where c.relnamespace = to_regnamespace('$SCHEMA') and c.relkind='r' and c.relname='clients';")

if [ "${JA_APLICADO:-0}" = "1" ]; then
  titulo "Estado do banco"
  amarelo "  as migrations ja foram aplicadas (schema '$SCHEMA' em uso)."
  echo "  Pulando a aplicacao e indo direto para a verificacao."
  PULAR_APLICACAO=1
else
  PULAR_APLICACAO=0
fi

# ---------------------------------------------------------------------------
# Backup — a 0012 move tabelas, entao um erro aqui custa dados
# ---------------------------------------------------------------------------
if [ "$PULAR_APLICACAO" -eq 1 ]; then
  : # nada sera alterado; backup desnecessario
elif [ "$PULAR_BACKUP" -eq 0 ]; then
  titulo "Backup antes de mover dados"
  mkdir -p "$DIR_BACKUP"
  ARQUIVO_BACKUP="$DIR_BACKUP/supabase-$(date +%Y%m%d-%H%M%S).sql"
  if despejar > "$ARQUIVO_BACKUP" 2>/dev/null && [ -s "$ARQUIVO_BACKUP" ]; then
    verde "  gravado: $ARQUIVO_BACKUP ($(du -h "$ARQUIVO_BACKUP" | cut -f1))"
  else
    rm -f "$ARQUIVO_BACKUP"
    vermelho "ERRO: o backup falhou. A 0012 move tabelas — nao siga sem backup."
    echo "  Se ja tiver um backup por fora, repita com --pular-backup."
    exit 1
  fi
else
  amarelo "  backup pulado a pedido (--pular-backup)"
fi

# ---------------------------------------------------------------------------
# Aplicacao, na ordem
# ---------------------------------------------------------------------------
if [ "$PULAR_APLICACAO" -eq 0 ]; then
  titulo "Aplicando migrations"
  SAIDA=$(mktemp)
  trap 'rm -f "$SAIDA"' EXIT
  for m in "${MIGRATIONS[@]}"; do
    nome=$(basename "$m")
    printf '  %-38s' "$nome"
    if rodar_sql -f "$m" > "$SAIDA" 2>&1; then
      verde "OK"
    else
      echo
      vermelho "FALHOU em $nome:"
      # Mostra a saida inteira, e nao so linhas com "error": a mensagem util
      # pode vir em outro idioma ou sem essa palavra.
      sed 's/^/    /' "$SAIDA" | tail -15
      echo
      echo "  Nada foi aplicado desta migration (ON_ERROR_STOP)."
      [ "$PULAR_BACKUP" -eq 0 ] && echo "  Backup em: ${ARQUIVO_BACKUP:-nenhum}"
      exit 1
    fi
  done
fi

# ---------------------------------------------------------------------------
# Verificacao
# ---------------------------------------------------------------------------
titulo "Verificando o resultado"
FALHAS=0

checar() {
  local descricao="$1" sql="$2" esperado="$3" obtido
  obtido=$(consultar "$sql")
  if [ "$obtido" = "$esperado" ]; then
    printf '  %-44s %s\n' "$descricao" "$(verde OK)"
  else
    printf '  %-44s %s (esperado %s, obtido %s)\n' \
      "$descricao" "$(vermelho FALHOU)" "$esperado" "${obtido:-vazio}"
    FALHAS=$((FALHAS + 1))
  fi
}

checar "schema $SCHEMA existe" \
  "select count(*) from pg_namespace where nspname='$SCHEMA';" "1"

checar "RPC search_exercises registrada" \
  "select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='$SCHEMA' and p.proname='search_exercises';" "1"

checar "search_vector preenchido no catalogo" \
  "select count(*) from $SCHEMA.exercises where search_vector is null;" "0"

# O bug que a 0011 corrigiu: RLS ligado sem policy nega tudo silenciosamente.
checar "nenhuma tabela com RLS e sem policy" \
  "select count(*) from pg_class c where c.relnamespace='$SCHEMA'::regnamespace and c.relkind='r' and c.relrowsecurity and not exists (select 1 from pg_policies p where p.schemaname='$SCHEMA' and p.tablename=c.relname);" "0"

checar "nenhuma tabela de negocio sem RLS" \
  "select count(*) from pg_class c where c.relnamespace='$SCHEMA'::regnamespace and c.relkind='r' and not c.relrowsecurity;" "0"

# O bug que apareceu ao testar a 0012: funcao movida com search_path velho
# passaria a ler a tabela homonima de outro projeto ainda no public.
checar "nenhuma funcao apontando para public" \
  "select count(*) from pg_proc p where p.pronamespace='$SCHEMA'::regnamespace and p.prokind='f' and (pg_get_functiondef(p.oid) like '%public.%' or array_to_string(p.proconfig,',') like '%public%');" "0"

checar "public sem tabelas deste projeto" \
  "select count(*) from pg_class c where c.relnamespace='public'::regnamespace and c.relkind='r' and c.relname in ('clients','sessions','periodizations','prescription_items','profiles');" "0"

# ---------------------------------------------------------------------------
# PostgREST — pre-requisito silencioso: sem o schema exposto, a API da 404 em
# tudo, mesmo com as tabelas e o RLS corretos.
# ---------------------------------------------------------------------------
titulo "Conferindo o PostgREST"
if [ "$MODO" = "docker" ]; then
  CONTAINER_REST=$(docker ps --format '{{.Names}}' | grep -Ei 'rest|postgrest' | head -1 || true)
  if [ -n "$CONTAINER_REST" ]; then
    SCHEMAS=$(docker exec "$CONTAINER_REST" printenv PGRST_DB_SCHEMAS 2>/dev/null || true)
    if printf '%s' "$SCHEMAS" | grep -q "$SCHEMA"; then
      verde "  PGRST_DB_SCHEMAS ja inclui '$SCHEMA' ($SCHEMAS)"
    else
      amarelo "  ATENCAO: PGRST_DB_SCHEMAS nao inclui '$SCHEMA'."
      echo "     valor atual: ${SCHEMAS:-(nao definido)}"
      echo
      echo "     Sem isso a API responde 404 em TUDO, mesmo com o banco correto."
      echo "     Na stack do Supabase, ajuste para:"
      echo "       PGRST_DB_SCHEMAS=public,storage,graphql_public,$SCHEMA"
      echo "     e reinicie o servico 'rest'."
      FALHAS=$((FALHAS + 1))
    fi
  else
    amarelo "  container do PostgREST nao encontrado; confira PGRST_DB_SCHEMAS a mao."
  fi
else
  amarelo "  modo conexao direta: confira PGRST_DB_SCHEMAS a mao na stack."
  echo "     PGRST_DB_SCHEMAS=public,storage,graphql_public,$SCHEMA"
fi

# ---------------------------------------------------------------------------
titulo "Resultado"
if [ "$FALHAS" -eq 0 ]; then
  verde "Tudo certo. Banco pronto para o app."
  echo
  echo "Proximos passos:"
  echo "  1. rotacionar JWT_SECRET e as chaves, se ainda forem as de exemplo"
  echo "  2. build do app no EasyPanel com as chaves novas"
  echo "  3. conferir: curl -s https://<dominio-do-app>/api/health?deep=1"
else
  vermelho "$FALHAS verificacao(oes) falharam. Ver docs/MIGRATIONS.md."
  exit 1
fi
