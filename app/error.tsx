'use client'

import { useEffect } from 'react'

import { classesBotao } from '@/components/ui/button'

/**
 * Boundary de erro das rotas.
 *
 * Sem este arquivo, qualquer excecao nao tratada num Server Component vira a
 * tela padrao do Next ("Application error: a server-side exception has
 * occurred") — sem contexto e sem caminho de volta. Em producao o Next omite a
 * mensagem original por seguranca e entrega so o `digest`, que e o identificador
 * para achar o stack trace correspondente no log do container.
 */
export default function ErroDeRota({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Em producao o console do browser nao recebe a mensagem original; o log do
    // servidor recebe. Registrar aqui ajuda no diagnostico em desenvolvimento.
    console.error('Erro nao tratado na rota:', error)
  }, [error])

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-6 px-6 py-16">
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl">Algo deu errado.</h1>
        <p className="text-muted-foreground">
          A página não pôde ser carregada. Se o problema persistir, o log do
          servidor tem o detalhe técnico.
        </p>
        {error.digest ? (
          <p className="text-sm text-muted-foreground">
            Código para o suporte:{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono">{error.digest}</code>
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={reset} className={classesBotao()}>
          Tentar de novo
        </button>
        <a href="/dashboard" className={classesBotao({ variant: 'outline' })}>
          Voltar ao início
        </a>
      </div>
    </main>
  )
}
