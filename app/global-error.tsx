'use client'

/**
 * Ultimo boundary: pega erros lancados no proprio `app/layout.tsx`.
 *
 * Quando este componente renderiza, o layout raiz falhou — logo `<html>`,
 * `<body>`, a fonte e o `globals.css` nao existem. Por isso ele monta o
 * documento inteiro e usa estilo inline: qualquer dependencia externa poderia
 * ser justamente a que quebrou.
 */
export default function ErroGlobal({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="pt-BR">
      <body
        style={{
          margin: 0,
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
          background: '#0b1220',
          color: '#e5e7eb',
          fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
        }}
      >
        <main style={{ maxWidth: '32rem' }}>
          <h1 style={{ fontSize: '1.75rem', margin: '0 0 0.75rem' }}>
            A aplicação não pôde iniciar.
          </h1>
          <p style={{ margin: '0 0 0.75rem', lineHeight: 1.6, color: '#9ca3af' }}>
            Isso costuma indicar variável de ambiente ausente ou inválida no
            container. O log do servidor traz a mensagem exata.
          </p>
          {error.digest ? (
            <p style={{ margin: '0 0 1.25rem', fontSize: '0.875rem', color: '#9ca3af' }}>
              Código para o suporte:{' '}
              <code style={{ fontFamily: 'ui-monospace, monospace' }}>{error.digest}</code>
            </p>
          ) : null}
          <button
            type="button"
            onClick={reset}
            style={{
              cursor: 'pointer',
              borderRadius: '0.375rem',
              border: 'none',
              padding: '0.625rem 1.25rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              background: '#f59e0b',
              color: '#0b1220',
            }}
          >
            Tentar de novo
          </button>
        </main>
      </body>
    </html>
  )
}
