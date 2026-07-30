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
| sem acento (unaccent) | `search_exercises('gluteo')` | ambos os exercícios |
| sem acento composto | `search_exercises('elevacao pelvica')` | Elevação pélvica |
| filtro por músculo | `p_muscle => 'Glúteo máximo'` | ambos |
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

## Pendências conhecidas na 0010

- `out_weekly_volume_series` retorna sempre `0`. A agregação de volume semanal
  por grupo muscular é trabalho da Fase 4.
- A RPC ainda **não é consumida pela UI**. O catálogo lateral do builder
  (`components/builder/catalog-sidebar.tsx`) usa `searchExercises()` com
  `ilike`, que não tem unaccent, trigram nem as anotações contextuais. Trocar o
  consumo é o próximo passo da Fase 3.
- `client_anamnesis.restricted_movement_patterns` existe mas nenhuma tela a
  preenche ainda (UI de anamnese = Fase 4).
