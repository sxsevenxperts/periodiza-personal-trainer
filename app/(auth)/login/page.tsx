import type { Metadata } from 'next'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata: Metadata = {
  title: 'Entrar',
}

// TODO(auth): substituir este placeholder pelo formulário de login real —
// client component com react-hook-form + zod, server action chamando
// `supabase.auth.signInWithPassword`, tratamento de erro em pt-BR e
// redirecionamento para o valor de `searchParams.redirecionar` (validado
// contra rota interna) ou para /dashboard.
export default function PaginaLogin() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 py-16">
      <Card>
        <CardHeader>
          <CardTitle>Entrar no Periodiza</CardTitle>
          <CardDescription>
            Use o e-mail cadastrado para acessar seus alunos e periodizações.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Formulário de autenticação em construção.
          </p>
        </CardContent>
      </Card>
    </main>
  )
}
