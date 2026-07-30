# Deploy no EasyPanel

## Problema que este documento resolve

O deploy falhava com:

```
ERROR: failed to build: failed to solve: failed to read dockerfile:
open Dockerfile: no such file or directory
```

**Causa:** o EasyPanel está configurado para buildar via Dockerfile
(`docker buildx build -f /etc/easypanel/projects/.../code/Dockerfile`), mas o
repositório não tinha nenhum `Dockerfile`. O app nunca chegava a subir.

**Correção aplicada neste repositório** (em `main` desde o merge do PR #2, `3e2cac8`):

| Arquivo | O que faz |
|---|---|
| `Dockerfile` | Build multi-stage (deps → builder → runner) do Next.js 15 |
| `.dockerignore` | Mantém `node_modules`, `.next` e `.env*` fora da imagem |
| `next.config.mjs` | `output: 'standalone'`, necessário para a imagem enxuta |

> Um segundo sintoma, `No such image: easypanel/startups/periodizacao:latest`,
> era consequência disso: sem build bem-sucedido, nenhuma imagem era produzida
> e a etapa de execução não tinha o que iniciar.

O estágio `deps` instala `libc6-compat`: o Alpine usa musl e os binários nativos
do SWC (compilador do Next) esperam glibc. É a recomendação do Dockerfile
oficial do Next.js.

---

## Nomes das variáveis de ambiente

O EasyPanel publica estes build args para os serviços do projeto:

```
--build-arg 'SUPABASE_URL=...'
--build-arg 'SUPABASE_KEY=...'
```

O app, porém, lê `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`
(validados por `lib/env.ts` com zod). Além disso, variáveis `NEXT_PUBLIC_*` são
resolvidas pelo Next **durante o build** — passá-las só como env de runtime não
basta.

**O Dockerfile aceita os dois conjuntos de nomes.** Um passo de resolução no
estágio `builder` monta `.env.production` a partir do que estiver disponível:

| Preenchido | Usado |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ele |
| só `SUPABASE_URL` | ele, como alias |
| ambos | `NEXT_PUBLIC_*` tem precedência |
| nenhum | build falha com mensagem explícita |

Assim o deploy funciona com a configuração que o EasyPanel já tem, sem exigir
renomeação. Cadastrar os nomes `NEXT_PUBLIC_*` continua sendo o mais explícito,
mas deixou de ser obrigatório.

### Guarda de segurança

`SUPABASE_KEY` é um nome genérico, e apontá-lo para a **service_role** exporia
o segredo — qualquer `NEXT_PUBLIC_*` pode acabar no bundle do browser. O
Dockerfile decodifica o payload do JWT e **aborta o build** se o papel for
`service_role`, com mensagem pedindo a chave anon.

### Por que a resolução acontece dentro de um `RUN`

Um `ENV VAR=${OUTRA:-$TERCEIRA}` dependeria da expansão aninhada do parser do
Dockerfile. Fazer no `RUN` usa apenas semântica POSIX de shell, que é
previsível. O resultado vai para `.env.production`, lido pelo `next build`.

---

## Configuração no EasyPanel

### 1. Build args (aba de Build / Environment do serviço)

Qualquer um dos dois conjuntos serve:

| Nome | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` *ou* `SUPABASE_URL` | URL do Supabase (ex.: `https://<host>`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` *ou* `SUPABASE_KEY` | chave **anon** do projeto |

⚠️ A chave precisa ser a **anon**. Se for a service_role, o build aborta de
propósito.

### 2. Variáveis de runtime

As duas acima também, mais (se o container rodar scripts admin):

| Nome | Valor |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | chave service role — **nunca** como build arg de bundle cliente |

### 3. Porta

O container escuta em `3000` (`EXPOSE 3000`, `PORT=3000`, `HOSTNAME=0.0.0.0`).
Aponte o proxy do EasyPanel para `3000`.

### 4. Rebuild

Dispare um novo deploy. O build agora encontra o `Dockerfile` na raiz do repo.

---

## Validações executadas neste repositório

| Verificação | Como foi verificado | Resultado |
|---|---|---|
| `npm run lint` | executado localmente | 0 erros, 0 avisos |
| `npx tsc --noEmit` | executado localmente | 0 erros |
| `npm run build` | executado localmente | sucesso, 11/11 páginas |
| `output: standalone` gera `server.js` | `ls .next/standalone/server.js` | existe |
| Server standalone sobe e responde | `node server.js` + `curl` | HTTP 200 em `/` e `/login` |
| `next build` lê `.env.production` | build com as vars removidas do ambiente | sucesso, valor inlinado nos bundles |
| resolução de aliases | script executado nos 4 cenários | alias usado, precedência correta, ausência falha, service_role bloqueada |

**Não verificado neste ambiente:** o `docker build` em si — o sandbox de
desenvolvimento não tem daemon Docker. O que o Dockerfile depende (saída
standalone, caminhos de `COPY`, arranque via `node server.js`, porta) foi
validado diretamente, mas a construção da imagem só será confirmada no
primeiro build do EasyPanel.

---

## Se o build ainda falhar

**`ERRO: build arg NEXT_PUBLIC_SUPABASE_URL ausente.`**
O build arg não chegou. Confirme que foi cadastrado como *build arg*, não
apenas como variável de runtime.

**Erro de lint/tipo durante `npm run build`**
Rode `npm run lint && npx tsc --noEmit` localmente antes de subir. O build de
produção do Next falha em erro de lint ou de tipo por decisão do projeto
(`next.config.mjs` documenta que `ignoreBuildErrors` nunca deve ser ligado).

**Container sobe mas as páginas erram**
Provável falta das variáveis de runtime. Veja o log do container: `lib/env.ts`
imprime em português qual variável está ausente ou inválida.

---

## Aplicar as migrations do banco

O deploy do app **não** aplica migrations. Veja `docs/MIGRATIONS.md`.
