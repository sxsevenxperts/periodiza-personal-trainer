'use client'

import * as React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

/**
 * Providers globais do cliente. Fica em componente separado para o
 * `app/layout.tsx` continuar sendo um Server Component.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  // useState com inicializador garante um QueryClient por sessao de browser,
  // e nao um por render nem um compartilhado entre requisicoes no servidor.
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  )

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
