import * as React from 'react'

import { cn } from '@/lib/utils'

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean
}

/**
 * Select nativo. Acessivel por teclado e leitor de tela sem JavaScript extra.
 * Combos com busca (ex: seletor de exercicio) terao componente proprio.
 */
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  function Select({ className, invalid = false, children, ...props }, ref) {
    return (
      <select
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'aria-[invalid=true]:border-destructive',
          className,
        )}
        {...props}
      >
        {children}
      </select>
    )
  },
)

export const SelectOption = React.forwardRef<
  HTMLOptionElement,
  React.OptionHTMLAttributes<HTMLOptionElement>
>(function SelectOption({ className, ...props }, ref) {
  return <option ref={ref} className={cn('bg-background', className)} {...props} />
})
