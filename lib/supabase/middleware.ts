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
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

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
