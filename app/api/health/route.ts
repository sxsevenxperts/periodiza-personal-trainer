import { NextResponse } from 'next/server'

/**
 * Sonda de saude do container.
 *
 * Existe por dois motivos concretos no deploy do EasyPanel:
 *
 * 1. `HEALTHCHECK` do Docker precisa de um alvo barato que nao dependa do
 *    banco. Sem isso o painel so consegue dizer "502", sem distinguir
 *    "container ainda subindo" de "container quebrado".
 * 2. Diagnosticar de DENTRO do container se o Supabase esta alcancavel. Um
 *    `curl` da sua maquina passa por DNS e proxy diferentes; o que importa e a
 *    rota que o container enxerga.
 *
 * A rota fica fora do matcher do `middleware.ts` (que ignora `/api`), entao
 * responde mesmo com a sessao quebrada ou o Supabase fora do ar.
 *
 *   GET /api/health          -> liveness, nao toca a rede
 *   GET /api/health?deep=1   -> tambem sonda o Supabase
 *
 * Nunca devolve chave nenhuma: da URL sai so o host, e da chave so o
 * comprimento e o papel declarado no JWT.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TIMEOUT_SONDA_MS = 5_000

type Diagnostico = {
  ok: boolean
  detalhe: string
}

/**
 * Extrai o host da URL sem nunca lancar.
 *
 * `new URL()` lanca em entrada malformada — e "malformada" inclui o caso mais
 * provavel de erro do operador: informar o host sem o esquema
 * (`meu-supabase.easypanel.host` em vez de `https://meu-supabase...`). Deixar a
 * excecao subir derrubaria justamente a rota cuja razao de existir e responder
 * quando a configuracao esta errada.
 */
function hostDaUrl(url: string): { host: string | null; erro?: string } {
  try {
    return { host: new URL(url).host }
  } catch {
    return {
      host: null,
      erro:
        'URL invalida — nao foi possivel interpretar. Confira se o esquema ' +
        '(https://) esta presente.',
    }
  }
}

/** Le o campo `role` do payload do JWT sem validar assinatura. */
function papelDoJwt(chave: string): string | null {
  const payload = chave.split('.')[1]
  if (!payload) return null
  try {
    const json = Buffer.from(payload, 'base64').toString('utf8')
    const dados = JSON.parse(json) as { role?: unknown }
    return typeof dados.role === 'string' ? dados.role : null
  } catch {
    return null
  }
}

/**
 * Sonda `/auth/v1/health` no gateway do Supabase.
 *
 * A distincao que importa: um dominio sem servico vinculado no EasyPanel
 * devolve HTTP 200 com a pagina catch-all do proxy — em HTML. Por isso nao
 * basta olhar o status; o corpo precisa ser JSON.
 */
async function sondarSupabase(url: string, chave: string): Promise<Diagnostico> {
  const alvo = `${url.replace(/\/+$/, '')}/auth/v1/health`

  let resposta: Response
  try {
    resposta = await fetch(alvo, {
      headers: { apikey: chave },
      signal: AbortSignal.timeout(TIMEOUT_SONDA_MS),
      cache: 'no-store',
    })
  } catch (erro) {
    const causa = erro instanceof Error ? erro.message : String(erro)
    return {
      ok: false,
      detalhe: `nao foi possivel conectar: ${causa}`,
    }
  }

  const tipo = resposta.headers.get('content-type') ?? ''

  if (!tipo.includes('json')) {
    return {
      ok: false,
      detalhe:
        `HTTP ${resposta.status} com content-type "${tipo || 'ausente'}" — ` +
        'resposta nao e JSON. Tipicamente a pagina catch-all do proxy, ou seja, ' +
        'nenhum servico do Supabase esta vinculado a esse dominio.',
    }
  }

  if (!resposta.ok) {
    return {
      ok: false,
      detalhe: `HTTP ${resposta.status} — o gateway respondeu, mas recusou a sonda.`,
    }
  }

  return { ok: true, detalhe: `HTTP ${resposta.status} — gateway do Supabase respondendo.` }
}

export async function GET(request: Request) {
  const profundo = new URL(request.url).searchParams.get('deep') !== null

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const chave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const { host, erro: erroDeUrl } = url ? hostDaUrl(url) : { host: null }

  const configuracao = {
    NEXT_PUBLIC_SUPABASE_URL: host ?? (url ? { invalida: erroDeUrl } : null),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: chave
      ? { comprimento: chave.length, papel: papelDoJwt(chave) }
      : null,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'definida' : null,
  }

  const faltando = [
    !url && 'NEXT_PUBLIC_SUPABASE_URL',
    !chave && 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    url && !host && 'NEXT_PUBLIC_SUPABASE_URL (presente, porem invalida)',
  ].filter((nome): nome is string => typeof nome === 'string')

  const base = {
    status: faltando.length === 0 ? 'ok' : 'configuracao_incompleta',
    versao: process.env.NEXT_PUBLIC_APP_VERSION ?? null,
    momento: new Date().toISOString(),
    configuracao,
    faltando: faltando.length > 0 ? faltando : undefined,
  }

  if (!profundo) {
    // Liveness: o processo respondeu, logo esta vivo. Nao depende do Supabase,
    // senao uma instabilidade do banco derrubaria o container em loop.
    return NextResponse.json(base, { status: 200 })
  }

  if (!url || !chave || !host) {
    return NextResponse.json(
      {
        ...base,
        supabase: {
          ok: false,
          detalhe: host
            ? 'variaveis ausentes; sonda nao executada.'
            : 'configuracao invalida; sonda nao executada.',
        },
      },
      { status: 503 },
    )
  }

  const supabase = await sondarSupabase(url, chave)

  return NextResponse.json(
    { ...base, status: supabase.ok ? 'ok' : 'supabase_inacessivel', supabase },
    { status: supabase.ok ? 200 : 503 },
  )
}
