import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

import {
  envPublico,
  urlSupabaseServidor,
  NOME_COOKIE_SESSAO,
  SCHEMA_DO_PROJETO,
} from '@/lib/env'
import type { Database } from '@/lib/types/database'

/**
 * Cliente Supabase para server components, server actions e route handlers.
 *
 * Next 15: `cookies()` e assincrono, por isso a funcao e `async` e precisa de
 * `await` na chamada. Use getAll/setAll — get/set/remove estao depreciados no
 * @supabase/ssr e quebram o refresh de token.
 *
 * Nunca faca cache deste cliente em modulo: ele carrega o contexto de cookies
 * da requisicao atual.
 */
export async function criarClienteServidor() {
  const { NEXT_PUBLIC_SUPABASE_ANON_KEY } = envPublico()
  const cookieStore = await cookies()

  return createServerClient<Database>(
    // Rede interna quando SUPABASE_INTERNAL_URL existir; caso contrario, a URL
    // publica. O nome do cookie e fixo, entao a sessao vale nos dois casos.
    urlSupabaseServidor(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookieOptions: { name: NOME_COOKIE_SESSAO },
      db: { schema: SCHEMA_DO_PROJETO },
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options)
            }
          } catch {
            // Server Components nao podem escrever cookies. O middleware ja
            // renova a sessao a cada requisicao, entao ignorar aqui e seguro.
          }
        },
      },
    },
  )
}
