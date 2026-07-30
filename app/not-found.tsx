import Link from 'next/link'

import { classesBotao } from '@/components/ui/button'

/**
 * Pagina 404. Sem este arquivo o Next serve a tela padrao em ingles, que
 * destoa do resto do produto (`<html lang="pt-BR">`).
 */
export default function NaoEncontrado() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-6 px-6 py-16">
      <div className="flex flex-col gap-3">
        <span className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Erro 404
        </span>
        <h1 className="text-3xl">Página não encontrada.</h1>
        <p className="text-muted-foreground">
          O endereço não existe ou o item foi removido.
        </p>
      </div>

      <div>
        {/* `/` e nao `/dashboard`: a raiz redireciona quem tem sessao para o
            dashboard e mostra a landing para quem nao tem. */}
        <Link href="/" className={classesBotao()}>
          Voltar ao início
        </Link>
      </div>
    </main>
  )
}
