'use client'

import { createBrowserClient } from '@supabase/ssr'

import { envPublico, NOME_COOKIE_SESSAO, SCHEMA_DO_PROJETO } from '@/lib/env'
import type { Database } from '@/lib/types/database'

/**
 * Cliente Supabase para componentes com "use client".
 * O @supabase/ssr mantem a sessao em cookies, entao o mesmo login vale para
 * server components, server actions e route handlers.
 *
 * O browser sempre usa a URL **publica** — e a unica que ele consegue alcancar.
 * O servidor pode usar outra (ver `urlSupabaseServidor`), e por isso o nome do
 * cookie e fixado nos dois lados.
 */
export function criarClienteBrowser() {
  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } = envPublico()

  return createBrowserClient<Database>(
    NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookieOptions: { name: NOME_COOKIE_SESSAO },
      db: { schema: SCHEMA_DO_PROJETO },
    },
  )
}
