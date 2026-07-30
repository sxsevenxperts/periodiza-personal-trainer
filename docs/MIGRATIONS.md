# Migrations

As migrations vivem em `supabase/migrations/` e são aplicadas em ordem
numérica. O deploy do app **não** as executa — é um passo manual.

## Estado atual

| Migration | Aplicada no Supabase |
|---|---|
| 0001 – 0009 | sim (schema em uso) |
| 0010 | **não** — pendente |

## Aplicar a 0010

```bash
psql "postgresql://postgres:<SUPABASE_DB_PASSWORD>@<host>:5432/postgres" \
  -v ON_ERROR_STOP=1 \
  -f supabase/migrations/0010_session_label_and_search.sql
```

Use a senha de `SUPABASE_DB_PASSWORD` (veja `.env.example`). Não cole
credenciais em scripts versionados.

A migration é **idempotente** — reaplicar não causa erro.

### Verificar depois de aplicar

```sql
-- CHECK constraints de dominio
select conname from pg_constraint
 where conname in ('sessions_label_check','periodizations_split_check');
-- esperado: as duas linhas

-- search_vector preenchido em todo o catalogo
select count(*) as sem_vector from exercises where search_vector is null;
-- esperado: 0

-- RPC responde
select out_name_pt from search_exercises('agachamento') limit 5;

-- RPC com o contexto do aluno (anotacoes preenchidas)
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
| alias | `search_exercises('hip thrust')` | Elevação pélvica |
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
