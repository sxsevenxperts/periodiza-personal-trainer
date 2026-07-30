# Dockerfile de producao para o app Next.js 15 (App Router).
# Usado pelo EasyPanel, que executa `docker buildx build -f <repo>/Dockerfile`.
#
# ATENCAO — variaveis NEXT_PUBLIC_*:
# O Next inline as variaveis NEXT_PUBLIC_* no bundle do browser durante o BUILD.
# Por isso elas entram como ARG (build-time), nao apenas como env de runtime.
# No EasyPanel, cadastre os build args com EXATAMENTE estes nomes:
#   NEXT_PUBLIC_SUPABASE_URL
#   NEXT_PUBLIC_SUPABASE_ANON_KEY
# Passar SUPABASE_URL / SUPABASE_KEY nao funciona: lib/env.ts valida os nomes
# acima com zod e derruba o app na primeira renderizacao.

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
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

# Falha o build cedo, com mensagem clara, em vez de gerar um bundle quebrado
# que so estoura no browser do usuario.
RUN test -n "$NEXT_PUBLIC_SUPABASE_URL" \
 || (echo "ERRO: build arg NEXT_PUBLIC_SUPABASE_URL ausente." && exit 1)
RUN test -n "$NEXT_PUBLIC_SUPABASE_ANON_KEY" \
 || (echo "ERRO: build arg NEXT_PUBLIC_SUPABASE_ANON_KEY ausente." && exit 1)

ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
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
