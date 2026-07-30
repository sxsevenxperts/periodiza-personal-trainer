import * as React from 'react'

import { cn } from '@/lib/utils'

export type VarianteBotao =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'destructive'

export type TamanhoBotao = 'sm' | 'md' | 'lg' | 'icon'

const VARIANTES: Record<VarianteBotao, string> = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
  secondary: 'bg-muted text-foreground hover:bg-muted/70',
  outline: 'border border-border bg-transparent hover:bg-muted',
  ghost: 'bg-transparent hover:bg-muted',
  destructive:
    'bg-destructive text-destructive-foreground hover:bg-destructive/90',
}

const TAMANHOS: Record<TamanhoBotao, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-6 text-base',
  icon: 'h-10 w-10',
}

/**
 * Classes do botao sem o elemento `<button>`. Use quando o alvo precisa ser
 * outro elemento — tipicamente um `<Link>` de navegacao.
 */
export function classesBotao(
  opcoes: { variant?: VarianteBotao; size?: TamanhoBotao; className?: string } = {},
): string {
  const { variant = 'primary', size = 'md', className } = opcoes

  return cn(
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    'disabled:pointer-events-none disabled:opacity-50',
    VARIANTES[variant],
    TAMANHOS[size],
    className,
  )
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: VarianteBotao
  size?: TamanhoBotao
  /** Exibe estado de carregamento e bloqueia novos cliques. */
  loading?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      className,
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled,
      type = 'button',
      children,
      ...props
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled ?? loading}
        aria-busy={loading || undefined}
        className={classesBotao({ variant, size, className })}
        {...props}
      >
        {children}
      </button>
    )
  },
)
