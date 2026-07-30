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

## Healthcheck e diagnóstico de dentro do container

O container expõe `GET /api/health`. A rota fica **fora** do matcher do
`middleware.ts` (que ignora `/api`), então responde mesmo com o Supabase fora do
ar ou a sessão quebrada — que é exatamente quando você precisa dela.

| Chamada | O que faz | Resposta |
|---|---|---|
| `GET /api/health` | liveness — não toca a rede | `200` |
| `GET /api/health?deep=1` | também sonda o Supabase | `200` se alcançável, `503` se não |

```bash
curl -s "https://<dominio-do-app>/api/health?deep=1" | jq
```

A sonda profunda chama `/auth/v1/health` no gateway e olha o **content-type**,
não só o status. É essa distinção que identifica o modo de falha atual do
projeto: um domínio sem serviço vinculado no EasyPanel devolve HTML da página
catch-all do proxy, não JSON.

| `supabase.detalhe` | Leitura |
|---|---|
| `HTTP 200 — gateway do Supabase respondendo` | ✅ |
| `HTTP 4xx com content-type "text/html" … catch-all` | nenhum serviço vinculado a esse domínio |
| `nao foi possivel conectar: fetch failed` | DNS ou rede do container não alcança o host |
| `HTTP 401/403` | é o gateway certo; a chave é que está errada |

A resposta **nunca** inclui chave: da URL sai só o host, e da chave só o
comprimento e o papel declarado no JWT (`anon` / `service_role`) — útil para
flagrar chave trocada sem expor o segredo.

O `HEALTHCHECK` do Dockerfile usa a versão **rasa**, de propósito. Amarrar a
saúde do container à disponibilidade do Supabase faria uma instabilidade do
banco virar loop de restart.

### Sinais e redeploy

O `server.js` do Next standalone não instala handler de `SIGTERM`. Como PID 1 no
Linux, um processo sem handler explícito **ignora** o sinal — o EasyPanel
esperaria o timeout e mandaria `SIGKILL` em todo redeploy, derrubando
requisições em voo. Por isso a imagem usa `tini` como `ENTRYPOINT`.

---

## Quando o Supabase está fora do ar

O app não quebra, degrada:

| Camada | Comportamento |
|---|---|
| `middleware.ts` | `getUser()` não lança — o `@supabase/auth-js` converte falha de rede em `AuthRetryableFetchError` e devolve `user: null`. O efeito é *fail-closed*: rota protegida redireciona para `/login`. |
| log do container | `[auth] Supabase nao respondeu a verificacao de sessao (...)`, amortecido em 30s para uma indisponibilidade não inundar o log |
| `/` e `/login` | continuam respondendo `200` |
| `/api/health` | continua respondendo `200` |

Sem esse log, o sintoma no painel seria apenas "ninguém consegue entrar", sem
causa visível.

---

## Boundaries de erro

| Arquivo | Cobre |
|---|---|
| `app/error.tsx` | exceção em qualquer rota; mostra o `digest` para correlacionar com o log |
| `app/global-error.tsx` | exceção no próprio `app/layout.tsx` — monta o documento inteiro com estilo inline, já que `globals.css` e a fonte podem ser o que quebrou |
| `app/not-found.tsx` | 404 em pt-BR, no lugar da tela padrão do Next em inglês |

Em produção o Next omite a mensagem original no browser e entrega só o `digest`.
O stack trace correspondente sai no log do container.

---

## Riscos conhecidos do build

**`next/font/google`.** O `app/layout.tsx` usa `Inter` via `next/font/google`,
que **baixa a fonte durante o build**. Se a rede do builder do EasyPanel não
alcançar `fonts.googleapis.com`, o `next build` falha. O `npm ci` do mesmo build
já prova que há saída para a internet, então o risco é baixo — mas se aparecer
`Failed to fetch \`Inter\` from Google Fonts`, a correção é migrar para
`next/font/local` com o `.woff2` versionado no repositório.

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
| `npm ci` (lockfile em dia) | instalação limpa a partir de `package.json` + `package-lock.json` | 506 pacotes, sem erro |
| `/api/health` | `curl` no standalone rodando | `200`, sem vazar chave (só host, comprimento e papel) |
| `/api/health?deep=1` | `curl` com Supabase inalcançável | `503` com `nao foi possivel conectar: fetch failed` |
| sonda distingue catch-all | executada contra o domínio real do Supabase no EasyPanel | `HTTP 404 content-type text/html` — mesmo resultado de um host inventado |
| 404 em pt-BR | `curl /rota-inexistente` | `404` com a página "Página não encontrada" |
| rota protegida sem sessão | `curl /dashboard` | `307` → `/login?redirecionar=%2Fdashboard` |
| `/` e `/login` com Supabase fora | `curl` no standalone | `200` nos dois |
| log de falha de auth | requisição **com** cookie de sessão e Supabase fora | 1 linha `[auth] …AuthRetryableFetchError…` |
| amortecedor do log | 4 falhas seguidas | 1 linha só (janela de 30s) |
| requisição anônima não loga | `curl` sem cookie | 0 linhas — `AuthSessionMissingError` é filtrado |

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
Chame `GET /api/health?deep=1` — ela responde mesmo com o resto quebrado e diz
qual variável falta e se o Supabase está alcançável. `lib/env.ts` também imprime
no log qual variável está ausente ou inválida.

**Painel mostra 502**
O domínio está vinculado, mas o container não responde. Ou o build não concluiu,
ou o processo morreu no arranque — o log do container tem a causa. Um domínio
*sem* serviço vinculado dá **404 com HTML**, não 502; a diferença entre os dois
diz se o problema é de vínculo ou de processo.

**Ninguém consegue entrar, mas as páginas públicas abrem**
Assinatura de Supabase inalcançável. Procure `[auth]` no log do container e
confirme com `GET /api/health?deep=1`.

---

## Aplicar as migrations do banco

O deploy do app **não** aplica migrations. Veja `docs/MIGRATIONS.md`.
