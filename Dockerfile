# Dockerfile de producao para o app Next.js 15 (App Router).
# Usado pelo EasyPanel, que executa `docker buildx build -f <repo>/Dockerfile`.
#
# ATENCAO — variaveis NEXT_PUBLIC_*:
# O Next resolve as variaveis NEXT_PUBLIC_* durante o BUILD. Por isso elas
# entram como ARG (build-time), nao apenas como env de runtime.
#
# Nomes aceitos como build arg (qualquer um dos dois pares):
#   NEXT_PUBLIC_SUPABASE_URL       ou  SUPABASE_URL
#   NEXT_PUBLIC_SUPABASE_ANON_KEY  ou  SUPABASE_KEY
#
# Os nomes NEXT_PUBLIC_* sao os que lib/env.ts valida com zod e tem precedencia;
# o par sem prefixo e aceito como alias porque e o que o EasyPanel ja publica
# para os servicos do projeto. A resolucao acontece no estagio builder.
# A chave precisa ser a ANON — o build aborta se receber a service_role.

# ---------------------------------------------------------------------------
# 1. deps — instala dependencias com o lockfile
# ---------------------------------------------------------------------------
FROM node:20-alpine AS deps
WORKDIR /app
# libc6-compat: o Alpine usa musl, e os binarios nativos do SWC (compilador do
# Next) esperam glibc. Recomendacao do Dockerfile oficial do Next.js.
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN npm ci

# ---------------------------------------------------------------------------
# 2. builder — compila o Next em modo standalone
# ---------------------------------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat

ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY

# Aliases aceitos por compatibilidade com a configuracao existente do EasyPanel,
# que ja publica estes nomes para os servicos do mesmo projeto. Os nomes
# NEXT_PUBLIC_* tem precedencia quando ambos vierem preenchidos.
ARG SUPABASE_URL
ARG SUPABASE_KEY

ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Resolve os nomes, valida e grava .env.production — que o `next build` le.
#
# A resolucao acontece dentro de um RUN, e nao num ENV com ${VAR:-$OUTRA},
# para depender so de semantica POSIX de shell em vez de expansao aninhada do
# parser do Dockerfile.
#
# A guarda de service_role existe porque toda variavel NEXT_PUBLIC_* pode ser
# inlinada no bundle do browser (hoje so o codigo de servidor a consome, mas
# lib/supabase/client.ts a usaria no primeiro componente cliente). Como
# SUPABASE_KEY e um nome generico, alguem pode aponta-lo para a service_role
# sem perceber e expor o segredo a todos os visitantes. O papel fica no payload
# do JWT — se for service_role, o build para aqui.
RUN set -e; \
    url="${NEXT_PUBLIC_SUPABASE_URL:-$SUPABASE_URL}"; \
    key="${NEXT_PUBLIC_SUPABASE_ANON_KEY:-$SUPABASE_KEY}"; \
    if [ -z "$url" ]; then \
      echo "ERRO: informe NEXT_PUBLIC_SUPABASE_URL (ou SUPABASE_URL) como build arg."; \
      exit 1; \
    fi; \
    if [ -z "$key" ]; then \
      echo "ERRO: informe NEXT_PUBLIC_SUPABASE_ANON_KEY (ou SUPABASE_KEY) como build arg."; \
      exit 1; \
    fi; \
    payload=$(printf '%s' "$key" | cut -d. -f2); \
    case $((${#payload} % 4)) in 2) payload="${payload}==";; 3) payload="${payload}=";; esac; \
    if printf '%s' "$payload" | base64 -d 2>/dev/null | grep -q 'service_role'; then \
      echo "ERRO: a chave informada e a service_role, que nunca pode ir ao browser."; \
      echo "      Use a chave ANON do projeto Supabase."; \
      exit 1; \
    fi; \
    printf 'NEXT_PUBLIC_SUPABASE_URL=%s\n'      "$url" >  .env.production; \
    printf 'NEXT_PUBLIC_SUPABASE_ANON_KEY=%s\n' "$key" >> .env.production

RUN npm run build

# ---------------------------------------------------------------------------
# 3. runner — imagem final, sem toolchain de build
# ---------------------------------------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# O output standalone ja embute o server e as dependencias necessarias.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
