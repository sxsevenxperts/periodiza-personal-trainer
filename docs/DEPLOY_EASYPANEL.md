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

## Segundo problema: nomes das variáveis de ambiente

O log do build mostrava estes build args sendo passados:

```
--build-arg 'SUPABASE_URL=...'
--build-arg 'SUPABASE_KEY=...'
```

Esses nomes **não funcionam**. `lib/env.ts` valida com zod exatamente:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

e lança erro se faltarem. Além disso, variáveis `NEXT_PUBLIC_*` são inlinadas
pelo Next no bundle do browser **durante o build** — passá-las só como env de
runtime gera um bundle cliente quebrado, mesmo que o container suba.

Por isso o `Dockerfile` as declara como `ARG` e **falha o build cedo**, com
mensagem clara, se vierem vazias — em vez de publicar uma imagem que só quebra
no navegador do usuário.

---

## Configuração no EasyPanel

### 1. Build args (aba de Build / Environment do serviço)

Cadastre com estes nomes exatos:

| Nome | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do Supabase (ex.: `https://<host>`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | chave anon do projeto |

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
