import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

import { envPublico } from '@/lib/env'
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
  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } = envPublico()
  const cookieStore = await cookies()

  return createServerClient<Database>(
    NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
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
