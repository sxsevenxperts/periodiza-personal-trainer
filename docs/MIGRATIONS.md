# Migrations

As migrations vivem em `supabase/migrations/` e são aplicadas em ordem
numérica. O deploy do app **não** as executa — é um passo manual.

## Estado atual

| Migration | Aplicada no Supabase |
|---|---|
| 0001 – 0009 | sim (schema em uso) |
| 0010 | **não** — pendente |
| 0011 | **não** — pendente (RLS completo, ver abaixo) |

## Aplicar tudo de uma vez (recomendado)

```bash
# no servidor onde a stack do Supabase roda
npm run db:deploy
```

O script (`scripts/aplicar-no-servidor.sh`) faz o caminho inteiro:

1. descobre o container do Postgres da stack (ou usa `SUPABASE_DB_URL`);
2. **faz backup** com `pg_dump` — a 0012 move tabelas, então isso não é opcional;
3. aplica `0010 → 0011 → 0012`, **nessa ordem**, com `ON_ERROR_STOP`;
4. roda 7 verificações;
5. confere se `PGRST_DB_SCHEMAS` já inclui o schema do projeto.

Sai com código diferente de zero se qualquer verificação falhar.

**Rodar de novo é seguro.** Depois da 0012 as tabelas saem do `public`, e as
migrations 0010/0011 referenciam `public.*` — reexecutá-las falharia. O script
detecta o estado final e pula direto para a verificação.

### Sem acesso ao servidor

```bash
export SUPABASE_DB_URL="postgresql://postgres:SENHA@HOST:5432/postgres"
npm run db:deploy
```

### O que as verificações cobrem

| Verificação | Por que existe |
|---|---|
| schema do projeto existe | a 0012 aplicou |
| RPC `search_exercises` registrada | a 0010 aplicou |
| `search_vector` preenchido | o backfill da 0010 rodou |
| **nenhuma tabela com RLS e sem policy** | foi o bug da 0008 — nega tudo em silêncio |
| **nenhuma tabela de negócio sem RLS** | foi o outro bug da 0008 — expõe tudo |
| **nenhuma função apontando para `public`** | bug encontrado ao testar a 0012: função movida com `search_path` velho passaria a ler a tabela homônima de outro projeto |
| `public` sem tabelas deste projeto | a mudança de schema completou |

Os backups vão para `backups/`, que está no `.gitignore`.

---

## 0011 — RLS completo (crítica)

A 0008 deixou o isolamento pela metade, de três formas:

| Problema | Efeito |
|---|---|
| 8 tabelas **sem RLS nenhum** — incluindo `client_anamnesis` (dado de saúde) e `client_assessments` (medidas corporais) | qualquer usuário autenticado lia e escrevia dados de alunos de **outros treinadores** |
| 4 tabelas com RLS ligado e **zero policies** (`organizations`, `profiles`, `prescription_items`, `set_logs`) | no Postgres, RLS sem policy nega tudo — o builder não enxergava **nenhum** exercício prescrito |
| Praticamente nenhuma policy de escrita (só 1 insert) | criar aluno, prescrever, reordenar, registrar treino — tudo negado |

Ou seja: onde havia RLS o app não funcionava; onde o app funcionava não havia
isolamento. A 0011 fecha os dois lados, com policies `for all`
(select/insert/update/delete) e `with check` em todas as tabelas de negócio.

Aplicar junto com a 0010:

```bash
export SUPABASE_DB_URL="postgresql://postgres:SENHA@HOST:5432/postgres"
npm run db:migrate                                        # 0010
npm run db:migrate -- supabase/migrations/0011_rls_completo.sql
```

### Validação executada localmente

Testada contra **PostgreSQL 16 real**, com dois treinadores e um aluno cada:

| Cenário | Resultado |
|---|---|
| A lê os próprios alunos, anamneses, avaliações | 1 de cada ✅ |
| A lê a anamnese sigilosa do aluno de B | vazio ✅ |
| A insere anamnese no aluno de B | `new row violates row-level security policy` ✅ |
| A sequestra o aluno de B (`update personal_id`) | 0 linhas ✅ |
| A apaga o aluno de B | 0 linhas ✅ |
| B lê periodizações / sessões / prescrições de A | 0 de cada ✅ |
| B prescreve na sessão de A | bloqueado ✅ |
| A cria aluno, prescreve, reordena, remove | OK ✅ |
| A lê o catálogo compartilhado | OK ✅ |
| reaplicar a migration | sem erro (idempotente) ✅ |

> ⚠️ **Diagnóstico de 30/07 — nenhum serviço publicado no domínio do Supabase.**
>
> `xpert-backend-supabase.qfotry.easypanel.host` devolve a **mesma resposta,
> byte a byte, que um hostname inexistente**:
>
> | Hostname | md5 do corpo |
> |---|---|
> | `nao-existe-xyz-9a8b7c` (inventado) | `9d0e48091c0d` |
> | `xpert-backend-supabase` | `9d0e48091c0d` |
> | `startups-periodizacao` (o app) | `2b77172b2b7b` |
>
> O DNS é wildcard (`*.qfotry.easypanel.host` → `164.68.116.21`), então
> qualquer nome resolve — resolver não prova que exista serviço. O que prova é
> a resposta: o domínio do Supabase cai na **página catch-all** do proxy, igual
> a um nome inventado.
>
> **Conclusão:** não há serviço vinculado a esse domínio. O Supabase está
> parado, foi removido, ou o domínio nunca foi associado a ele. Não é
> roteamento para o serviço errado.
>
> Para comparação, o domínio do app responde **502** — ali existe vínculo, mas
> o container não sobe (coerente com o build ainda não ter concluído).

---

## Descobrir a URL correta da API do Supabase

Como não há nada publicado no domínio conhecido, o primeiro passo é no painel
do EasyPanel:

1. Confirme se o serviço do **Supabase ainda existe** e está **em execução**.
2. Identifique o serviço do **gateway da API** — costuma se chamar `kong` ou
   `supabase-kong` e expõe a porta **8000**. É ele que serve `/rest/v1/`,
   `/auth/v1/` e `/storage/v1/`. Não confunda com `studio` (interface web),
   `rest` (PostgREST interno) ou `db` (Postgres).
3. Na aba **Domains** desse serviço, verifique se há domínio público apontando
   para a porta 8000. Se não houver, crie.
4. Esse domínio é o valor de `NEXT_PUBLIC_SUPABASE_URL`.

### Confirmar que a URL está certa

```bash
curl -i "https://<URL-DO-KONG>/rest/v1/" -H "apikey: <chave-anon>"
```

| Resposta | Significado |
|---|---|
| `HTTP 200` com JSON (OpenAPI) | ✅ é a URL correta |
| `HTTP 401` com `{"message":"No API key found..."}` | ✅ é o Kong; só faltou a chave |
| `HTTP 404` com HTML | ❌ nenhum serviço vinculado a esse domínio |
| `HTTP 502` | domínio vinculado, mas o container não responde |

Se o Postgres (5432) não estiver exposto publicamente — que é o caso aqui — o
SQL Editor do Studio passa a ser o caminho para aplicar a migration.

### Confirmar a partir do container do app

Depois que o app subir no EasyPanel, a sonda embutida responde a mesma pergunta
de dentro da rede que importa (a do container, não a da sua máquina):

```bash
curl -s "https://<dominio-do-app>/api/health?deep=1" | jq .supabase
```

`{"ok": true, …}` significa que a URL configurada no build alcança o gateway.
Qualquer outro resultado descreve o motivo. Detalhes em `docs/DEPLOY_EASYPANEL.md`.

---

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
