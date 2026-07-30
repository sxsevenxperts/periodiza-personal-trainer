import type { NextRequest } from 'next/server'

import { atualizarSessao } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return atualizarSessao(request)
}

export const config = {
  matcher: [
    /**
     * Roda em todas as rotas, menos:
     * - _next/static e _next/image (assets do build)
     * - favicon e arquivos de imagem
     * - /api (route handlers cuidam da propria autorizacao)
     */
    '/((?!_next/static|_next/image|api|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
