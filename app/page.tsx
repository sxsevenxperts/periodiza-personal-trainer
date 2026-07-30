import Link from 'next/link'
import { redirect } from 'next/navigation'

import { classesBotao } from '@/components/ui/button'
import { criarClienteServidor } from '@/lib/supabase/server'

export default async function PaginaInicial() {
  const supabase = await criarClienteServidor()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center gap-8 px-6 py-16">
      <div className="flex flex-col gap-4">
        <span className="text-sm font-semibold uppercase tracking-widest text-primary">
          Periodiza
        </span>
        <h1 className="text-4xl sm:text-5xl">
          Periodização de treinos sem planilha e sem retrabalho.
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          Monte macrociclos, mesociclos e microciclos, prescreva os treinos A a G
          com um catálogo canônico de exercícios e acompanhe a execução de cada
          aluno em um lugar só.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Link href="/login" className={classesBotao({ size: 'lg' })}>
          Entrar
        </Link>
        <span className="text-sm text-muted-foreground">
          Acesso restrito a profissionais cadastrados.
        </span>
      </div>
    </main>
  )
}
