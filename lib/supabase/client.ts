'use client'

import { createBrowserClient } from '@supabase/ssr'

import { envPublico } from '@/lib/env'
import type { Database } from '@/lib/types/database'

/**
 * Cliente Supabase para componentes com "use client".
 * O @supabase/ssr mantem a sessao em cookies, entao o mesmo login vale para
 * server components, server actions e route handlers.
 */
export function criarClienteBrowser() {
  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } = envPublico()

  return createBrowserClient<Database>(
    NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY,
  )
}
