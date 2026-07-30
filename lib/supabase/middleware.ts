import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

import { envPublico } from '@/lib/env'
import type { Database } from '@/lib/types/database'

/** Prefixos que exigem sessao ativa — espelham o grupo de rotas `(app)`. */
export const ROTAS_PROTEGIDAS = [
  '/dashboard',
  '/alunos',
  '/periodizacoes',
  '/catalogo',
  '/modelos',
  '/configuracoes',
] as const

/** Rotas do grupo `(auth)`: quem ja esta logado nao deve ver. */
const ROTAS_PUBLICAS_DE_AUTH = ['/login'] as const

function ehRotaProtegida(pathname: string): boolean {
  return ROTAS_PROTEGIDAS.some(
    (rota) => pathname === rota || pathname.startsWith(`${rota}/`),
  )
}

function ehRotaDeAuth(pathname: string): boolean {
  return ROTAS_PUBLICAS_DE_AUTH.some(
    (rota) => pathname === rota || pathname.startsWith(`${rota}/`),
  )
}

/**
 * Renova o token da sessao e aplica a protecao de rotas.
 *
 * Regras do @supabase/ssr que nao podem ser quebradas:
 * 1. sempre devolver o `supabaseResponse` (ou copiar os cookies dele para o
 *    response que voce criar) — senao a sessao renovada se perde;
 * 2. nao rodar nenhuma logica entre criar o cliente e chamar `getUser()`;
 * 3. usar `getUser()`, nunca `getSession()`, porque so `getUser()` valida o JWT
 *    no servidor de auth.
 */
export async function atualizarSessao(request: NextRequest): Promise<NextResponse> {
  let supabaseResponse = NextResponse.next({ request })

  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } = envPublico()

  const supabase = createServerClient<Database>(
    NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value)
          }
          supabaseResponse = NextResponse.next({ request })
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options as Record<string, string>)
          }
        },
      },
    },
  )

  const {
    data: { user },
    error: erroDeAuth,
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Falha de rede contra o Supabase nao lanca excecao: o @supabase/auth-js a
  // converte em AuthRetryableFetchError e devolve `user: null`. O efeito e
  // fail-closed (todo mundo vira deslogado), que e o comportamento seguro — mas
  // sem este log a causa fica invisivel e o sintoma no painel e so "ninguem
  // consegue entrar". Diagnostico completo: GET /api/health?deep=1
  if (erroDeAuth) {
    registrarFalhaDeAuth(erroDeAuth)
  }

  if (!user && ehRotaProtegida(pathname)) {
    const destino = request.nextUrl.clone()
    destino.pathname = '/login'
    destino.search = ''
    destino.searchParams.set('redirecionar', pathname)
    return redirecionarPreservandoCookies(destino, supabaseResponse)
  }

  if (user && ehRotaDeAuth(pathname)) {
    const destino = request.nextUrl.clone()
    destino.pathname = '/dashboard'
    destino.search = ''
    return redirecionarPreservandoCookies(destino, supabaseResponse)
  }

  return supabaseResponse
}

/**
 * Erro esperado quando o visitante simplesmente nao esta logado. Nao e falha —
 * registra-lo encheria o log a cada requisicao anonima.
 */
const AUTH_SEM_SESSAO = 'AuthSessionMissingError'

/** Janela do amortecedor de log, para uma indisponibilidade nao inundar o log. */
const INTERVALO_ENTRE_LOGS_MS = 30_000

let ultimoLogDeAuth = 0

function registrarFalhaDeAuth(erro: { name?: string; message?: string }): void {
  if (erro.name === AUTH_SEM_SESSAO) return

  const agora = Date.now()
  if (agora - ultimoLogDeAuth < INTERVALO_ENTRE_LOGS_MS) return
  ultimoLogDeAuth = agora

  console.error(
    `[auth] Supabase nao respondeu a verificacao de sessao (${erro.name ?? 'erro'}): ` +
      `${erro.message ?? 'sem mensagem'}. ` +
      'Enquanto isso todo acesso e tratado como deslogado. ' +
      'Verifique NEXT_PUBLIC_SUPABASE_URL e se o gateway do Supabase esta no ar.',
  )
}

type DestinoDeRedirect = Parameters<typeof NextResponse.redirect>[0]

/** Redireciona sem descartar os cookies de sessao renovados pelo Supabase. */
function redirecionarPreservandoCookies(
  destino: DestinoDeRedirect,
  origem: NextResponse,
): NextResponse {
  const resposta = NextResponse.redirect(destino)
  for (const cookie of origem.cookies.getAll()) {
    resposta.cookies.set(cookie)
  }
  return resposta
}
