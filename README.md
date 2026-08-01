# Periodiza

SaaS de **periodização de treinos** para personal trainers e treinadores de força.
O produto substitui a planilha: o profissional cadastra o aluno, monta a periodização
(macrociclo → mesociclo → microciclo), prescreve os treinos **A a G** de cada microciclo
a partir de um catálogo canônico de exercícios e acompanha a execução real do aluno.

Diferencial: a busca de exercício é **contextual ao aluno** — sinaliza padrão de movimento
restrito na anamnese, equipamento indisponível, nível técnico acima do aluno, exercício já
prescrito em outro treino do mesmo microciclo e o volume semanal acumulado da região corporal.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 15 (App Router, Server Components, Server Actions) |
| Linguagem | TypeScript strict (`noUncheckedIndexedAccess`) |
| Estilo | Tailwind CSS 3.4 com cores semânticas via CSS variables (tema claro/escuro) |
| Banco, auth e storage | Supabase (PostgreSQL, RLS, Auth) |
| Acesso ao Supabase | `@supabase/ssr` (sessão em cookies, válida em client, server e middleware) |
| Estado de servidor no cliente | TanStack Query 5 |
| Formulários e validação | React Hook Form 7 + Zod 3 |
| Gráficos | Recharts 2 |
| Ícones | lucide-react |
| Testes | Vitest 2 |

---

## Rodando local

Pré-requisitos: **Node 20.9+** e um projeto Supabase (nuvem ou local via Supabase CLI).

```bash
# 1. dependências
npm install

# 2. variáveis de ambiente
cp .env.example .env.local
# preencha NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
# e SUPABASE_SERVICE_ROLE_KEY (esta última nunca vai para o browser)

# 3. servidor de desenvolvimento
npm run dev            # http://localhost:3000
```

Scripts disponíveis:

| Script | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run start` | Sobe o build de produção |
| `npm run lint` | ESLint com as regras do Next |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Vitest em modo CI |
| `npm run test:watch` | Vitest em watch |
| `npm run seed` | Popula taxonomia e catálogo (`tsx scripts/seed.ts`) |
| `npm run db:reset` | `supabase db reset` — recria o banco local e reaplica as migrations |
| `npm run db:migrate` | Aplica uma migration avulsa e verifica (`SUPABASE_DB_URL` no ambiente) |
| `npm run db:deploy` | Aplica 0010→0011→0012 no servidor, com backup e 7 verificações |

---

## Migrations no Supabase

As migrations vivem em `supabase/migrations/`, versionadas em SQL puro e aplicadas em ordem.

**Ambiente local (Supabase CLI):**

```bash
npx supabase start          # sobe Postgres, Auth, Storage em Docker
npm run db:reset            # dropa, recria e reaplica todas as migrations
npm run seed                # popula taxonomia + catálogo
```

**Projeto na nuvem:**

```bash
npx supabase login
npx supabase link --project-ref <PROJECT_REF>
npx supabase db push        # aplica as migrations pendentes no projeto remoto
npm run seed                # requer SUPABASE_SERVICE_ROLE_KEY no ambiente
```

**Depois de qualquer mudança de schema, regenere os tipos:**

```bash
npx supabase gen types typescript --local --schema public > lib/types/database.ts
# ou, no projeto remoto:
npx supabase gen types typescript --project-id <PROJECT_ID> --schema public > lib/types/database.ts
```

`lib/types/database.ts` é hoje um placeholder permissivo e será **substituído
integralmente** pelo arquivo gerado. Não edite à mão depois da geração.

> O seed usa a **service role** e ignora RLS. Rode apenas em desenvolvimento ou em
> deploy controlado, nunca a partir do browser.

Estado das migrations e como aplicar a 0010: `docs/MIGRATIONS.md`.

---

## Deploy (Docker / EasyPanel)

O repositório traz um `Dockerfile` multi-stage. O `next.config.mjs` usa
`output: 'standalone'`, então a imagem final roda `node server.js` na porta
`3000`.

```bash
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL="https://<host>" \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="<anon-key>" \
  -t periodiza .

docker run -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL="https://<host>" \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY="<anon-key>" \
  periodiza
```

As duas variáveis públicas precisam ser **build args**, não só variáveis de
runtime: o Next as resolve durante o build. O Dockerfile aceita qualquer um dos
dois pares — `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`, que
`lib/env.ts` valida com zod e têm precedência, ou `SUPABASE_URL` / `SUPABASE_KEY`
como alias, que é o que o EasyPanel já publica.

A chave precisa ser a **anon**: o build aborta se receber a service_role, que
nunca pode ir para o bundle do browser.

O container usa `tini` como PID 1 (para o `SIGTERM` do redeploy chegar ao Next) e
expõe uma sonda de saúde:

```bash
curl -s http://localhost:3000/api/health          # liveness, não toca a rede
curl -s http://localhost:3000/api/health?deep=1   # também sonda o Supabase
```

A sonda não devolve chave nenhuma — da URL sai só o host, e da chave só o
comprimento e o papel declarado no JWT.

Configuração no EasyPanel e diagnóstico de falhas: `docs/DEPLOY_EASYPANEL.md`.

### Supabase auto-hospedado

Se o Supabase roda no seu próprio servidor, defina também `SUPABASE_INTERNAL_URL`
(runtime) apontando para o gateway Kong na rede interna:

```
SUPABASE_INTERNAL_URL=http://supabase-kong:8000
```

O código de servidor passa a falar com o Supabase pela rede interna e o browser
segue no domínio público. O nome do cookie de sessão é fixo (`lib/env.ts`), o que
é pré-requisito para esse split — por padrão o `@supabase/ssr` deriva o nome do
hostname, e os dois lados procurariam cookies diferentes.

Armadilhas do auto-hospedado e como conferir: `docs/SUPABASE_AUTO_HOSPEDADO.md`.

---

## Estrutura de pastas

```
.
├── app/
│   ├── (auth)/login/            # rotas públicas de autenticação
│   ├── (app)/                   # shell autenticado (sidebar + conteúdo)
│   │   ├── dashboard/
│   │   ├── alunos/[clientId]/
│   │   ├── periodizacoes/[periodizationId]/   # builder de treinos A–G
│   │   ├── catalogo/
│   │   ├── modelos/
│   │   └── configuracoes/
│   ├── (student)/t/[periodizationId]/         # visão do aluno, por link
│   ├── api/health/route.ts      # sonda de saúde do container (fora do middleware)
│   ├── error.tsx                # boundary de erro das rotas
│   ├── global-error.tsx         # boundary do próprio layout raiz
│   ├── not-found.tsx            # 404 em pt-BR
│   ├── globals.css              # reset, CSS variables de tema, camada base
│   ├── layout.tsx               # <html lang="pt-BR">, fonte, Providers
│   └── page.tsx                 # landing; redireciona logado para /dashboard
├── components/
│   ├── layout/                  # navegação lateral e cabeçalho de página
│   ├── ui/                      # primitivos (Button, Card, Input, Label, Select, Badge, Table)
│   └── providers.tsx            # QueryClientProvider
├── lib/
│   ├── supabase/                # client (browser), server, middleware
│   ├── types/database.ts        # tipos gerados do schema (placeholder)
│   ├── env.ts                   # leitura validada das variáveis de ambiente
│   └── utils.ts                 # cn()
├── data/                        # taxonomy.json e catalog.json (fonte do seed)
├── docs/                        # specs de produto aprovadas
├── scripts/seed.ts              # carga idempotente de taxonomia e catálogo
├── supabase/migrations/         # schema versionado em SQL
└── middleware.ts                # refresh de sessão + proteção do grupo (app)
```

---

## Hierarquia canônica do domínio

A regra que sustenta o modelo de dados inteiro:

```
exercise  →  exercise_variant  →  prescription_item  →  workout_execution
```

| Nível | O que é | O que guarda | O que NUNCA guarda |
|---|---|---|---|
| **`exercise`** | O movimento canônico, único no catálogo (ex: *Agachamento livre*). | Nome pt/en, apelidos, grupo do catálogo, padrão de movimento, região corporal, músculo primário e secundários, nível técnico, lateralidade, família de substituição. | Qualquer parâmetro de treino. |
| **`exercise_variant`** | Uma execução concreta do exercício (ex: *com barra alta*, *no smith*, *com halteres*). | Equipamento, pegada, ângulo, amplitude, flag `is_default`. | Qualquer parâmetro de treino. |
| **`prescription_item`** | O exercício **prescrito** para um aluno em uma sessão (Treino A–G) de um microciclo. | Séries, faixa de repetições, carga, RIR/RPE alvo, descanso, cadência, método (drop-set, cluster…), ordem no treino. | Dados descritivos do exercício. |
| **`workout_execution`** | O que o aluno **realmente fez** naquele dia. | Data, séries executadas, carga usada, repetições feitas, RPE percebido, observações. | Prescrição — a prescrição é a referência, não o registro. |

Consequências práticas:

1. Prescrição mora **só** em `prescription_item`. Nenhuma série, repetição, carga, RIR, RPE,
   descanso, cadência ou método é gravado em `exercise` ou `exercise_variant`.
2. Trocar a variante de um item prescrito não altera o catálogo nem a prescrição.
3. Comparar prescrito × executado é a diferença entre `prescription_item` e
   `workout_execution` — por isso os dois nunca compartilham a mesma tabela.
4. A letra do treino (`A` a `G`) é identidade da `session`, e o vínculo do item com a letra é
   indireto: `prescription_item.session_id → session.label`. A letra não é duplicada no item.

Detalhamento do builder de treinos: `docs/SPEC-01-BUILDER-TREINOS.md`.
