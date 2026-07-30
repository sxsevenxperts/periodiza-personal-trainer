# Migrations

As migrations vivem em `supabase/migrations/` e são aplicadas em ordem
numérica. O deploy do app **não** as executa — é um passo manual.

## Estado atual

| Migration | Aplicada no Supabase |
|---|---|
| 0001 – 0009 | sim (schema em uso) |
| 0010 | **não** — pendente |

> ⚠️ **Verificação de 30/07:** `https://xpert-backend-supabase.qfotry.easypanel.host`
> respondeu **404 em todas as rotas testadas** (`/`, `/rest/v1/`, `/auth/v1/health`),
> com uma página HTML genérica de "Not Found" — não com o formato de erro do
> PostgREST. As portas 5432 e 6543 também não responderam.
>
> Ou seja: nesse endereço não há uma API do Supabase atendendo. Antes de aplicar
> a migration, confirme no EasyPanel qual é a URL pública correta do serviço
> Supabase (a que serve `/rest/v1/`) e se ele está em execução. O mesmo endereço
> é o que o app usa em `NEXT_PUBLIC_SUPABASE_URL` — se estiver errado, o deploy
> sobe mas nenhuma tela carrega dados.

## Aplicar a 0010

### Caminho recomendado — um comando

```bash
export SUPABASE_DB_URL="postgresql://postgres:SENHA@HOST:5432/postgres"
npm run db:migrate
```

A senha é a de `SUPABASE_DB_PASSWORD` (veja `.env.example`). A variável é lida
do ambiente, **nunca** passada como argumento — assim não fica no histórico do
shell nem visível na lista de processos.

O comando aplica a migration e roda a verificação sozinho:

```
Aplicando 0010_session_label_and_search.sql...
Migration aplicada.

Verificando...
  CHECK constraints de domínio                   OK
  coluna restricted_movement_patterns            OK
  RPC search_exercises (1 assinatura)            OK
  search_vector preenchido em todo o catálogo    OK
  busca por 'agachamento' retorna                OK (1 resultado(s))

Tudo certo. A busca contextual está ativa.
```

Se alguma verificação falhar, o comando sai com código diferente de zero e diz
qual falhou. A migration é **idempotente** — reaplicar não causa erro.

Para outra migration: `npm run db:migrate -- supabase/migrations/0011_x.sql`

### Caminho manual — psql direto

```bash
psql "postgresql://postgres:SENHA@HOST:5432/postgres" \
  -v ON_ERROR_STOP=1 \
  -f supabase/migrations/0010_session_label_and_search.sql
```

### Caminho sem acesso à porta 5432

Se o Postgres não estiver exposto (comum em Supabase self-hosted atrás de
proxy), use o **SQL Editor do Supabase Studio**: abra o arquivo
`supabase/migrations/0010_session_label_and_search.sql`, cole o conteúdo inteiro
e execute. Depois rode as consultas de verificação abaixo.

### Verificar manualmente

```sql
-- CHECK constraints de dominio  → esperado: 2
select count(*) from pg_constraint
 where conname in ('sessions_label_check','periodizations_split_check');

-- coluna da anamnese  → esperado: 1
select count(*) from information_schema.columns
 where table_name='client_anamnesis' and column_name='restricted_movement_patterns';

-- RPC registrada  → esperado: 1
select count(*) from pg_proc where proname='search_exercises';

-- search_vector preenchido  → esperado: 0
select count(*) from exercises where search_vector is null;

-- busca funciona  → esperado: pelo menos 1 linha
select out_name_pt from search_exercises('agachamento') limit 5;

-- contexto do aluno (anotacoes preenchidas)
select out_name_pt, out_has_restriction, out_missing_equipment
  from search_exercises('', p_client_id => '<uuid-do-aluno>');
```

---

## O que a 0010 faz

| Item | Detalhe |
|---|---|
| `sessions_label_check` | restringe `sessions.label` a A–G |
| `periodizations_split_check` | restringe `periodizations.split` aos splits válidos |
| `client_anamnesis.restricted_movement_patterns` | `text[]`, alimenta a anotação "restrito" |
| trigger `update_exercises_search_vector_trigger` | mantém `exercises.search_vector` com `unaccent` |
| backfill | preenche `search_vector` das linhas já existentes |
| RPC `search_exercises(...)` | busca full-text + trigram, com contexto do aluno |

### O que a 0010 **não** faz (já existia)

`sessions.label`, o unique `(microcycle_id, label)` e `periodizations.split`
foram criados em **0005**. `exercises.search_vector` e os índices
`exercises_search_gin` / `exercises_name_trgm` foram criados em **0004**. As
extensões `unaccent` e `pg_trgm` vêm da **0001**. A 0010 não recria nada disso.

---

## Validação executada localmente

A 0010 foi aplicada e testada contra um **PostgreSQL 16 real** (instância
temporária), sobre o schema reconstruído a partir das migrations 0001–0009:

| Cenário | Consulta | Resultado |
|---|---|---|
| nome exato | `search_exercises('Agachamento')` | Agachamento livre |
| alias | `search_exercises('hip thrust')` | Elevação pélvica, com `out_aliases_pt` = {hip thrust, ponte de glúteo} |
| erro de digitação (trigram) | `search_exercises('agacahmento')` | Agachamento livre |
| sem acento (unaccent) | `search_exercises('gluteo')` | Elevação pélvica (músculo "Glúteo máximo" entra no vetor) |
| sem acento composto | `search_exercises('elevacao pelvica')` | Elevação pélvica |
| filtro por músculo | `p_muscle_id => '<uuid>'` | só o do músculo pedido |
| filtro por equipamento ausente | `p_equipment => 'halter'` | vazio |
| anotação "restrito" | aluno com `extensao-quadril` restrito | Elevação pélvica = true |
| anotação "sem equipamento" | aluno só com `barra` | Agachamento livre = true |
| anotação "já prescrito" | exercício no Treino A do microciclo | true |
| CHECK label | `insert ... label='H'` | rejeitado |
| CHECK split | `update ... split='ABCX'` | rejeitado |
| idempotência | reaplicar o arquivo | sem erro |
| isolamento (RLS) | chamar como `authenticated` sem sessão | anotações = false, sem vazamento |

### Nota de segurança

A RPC é `security invoker` (não `definer`) e faz join obrigatório em `clients`,
que tem RLS. Um personal que passe o `client_id` de um aluno de outra
organização recebe as anotações como `false` — não lê a anamnese nem os
equipamentos daquele aluno. Isso foi verificado no teste de isolamento acima.

---

## Quem consome a RPC

`components/builder/catalog-sidebar.tsx` → `searchExercises(query, muscleId, { clientId, microcycleId })`
em `app/(app)/periodizacoes/[periodizationId]/actions.ts`.

O contexto vem da página do builder: `clientId` de `periodizations.client_id` e
`microcycleId` do microciclo exibido. Sem eles a busca funciona, mas as
anotações saem todas `false`.

Assinatura em uso:

```
search_exercises(
  p_query          text     default '',
  p_category       text     default null,
  p_movement       text     default null,
  p_muscle_id      uuid     default null,
  p_equipment      text     default null,
  p_client_id      uuid     default null,
  p_microcycle_id  uuid     default null,
  p_limit          integer  default 50
)
```

Colunas de retorno: `out_exercise_id`, `out_name_pt`, `out_name_en`,
`out_aliases_pt`, `out_primary_muscle`, `out_movement_pattern`,
`out_equipment`, `out_technical_level`, `out_has_restriction`,
`out_missing_equipment`, `out_already_prescribed`, `out_weekly_volume_series`.

Colunas de retorno usam prefixo `out_` para não colidir com os nomes das
colunas das tabelas dentro do corpo da função. A action normaliza esse prefixo
antes de entregar à UI.

---

## Pendências conhecidas na 0010

- `out_weekly_volume_series` retorna sempre `0`. A agregação de volume semanal
  por grupo muscular é trabalho da Fase 4.
- **Fallback temporário no app**: `searchExercises()` chama a RPC e, se ela não
  existir (migration não aplicada), cai numa busca por `ilike` para não derrubar
  a tela. Em desenvolvimento a sidebar mostra um aviso discreto; em produção o
  aviso fica só no log do servidor. **Remover o fallback depois de aplicar a
  0010** — ele está em `app/(app)/periodizacoes/[periodizationId]/actions.ts`,
  na função `buscarExerciciosSimplificado`.
- `client_anamnesis.restricted_movement_patterns` existe mas nenhuma tela a
  preenche ainda (UI de anamnese = Fase 4).
