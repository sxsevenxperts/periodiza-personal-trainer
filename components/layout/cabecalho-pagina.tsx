import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

interface CabecalhoPaginaProps {
  titulo: string
  descricao?: string
  /** Ações do canto direito (botões primários da tela). */
  acoes?: ReactNode
  className?: string
}

export function CabecalhoPagina({
  titulo,
  descricao,
  acoes,
  className,
}: CabecalhoPaginaProps) {
  return (
    <header
      className={cn(
        'mb-8 flex flex-wrap items-start justify-between gap-4',
        className,
      )}
    >
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl">{titulo}</h1>
        {descricao ? (
          <p className="max-w-2xl text-sm text-muted-foreground">{descricao}</p>
        ) : null}
      </div>
      {acoes ? <div className="flex items-center gap-2">{acoes}</div> : null}
    </header>
  )
}
