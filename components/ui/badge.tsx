import * as React from 'react'

import { cn } from '@/lib/utils'

export type VarianteBadge =
  | 'neutral'
  | 'primary'
  | 'success'
  | 'warning'
  | 'destructive'
  | 'outline'

const VARIANTES: Record<VarianteBadge, string> = {
  neutral: 'bg-muted text-muted-foreground',
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/15 text-warning',
  destructive: 'bg-destructive/10 text-destructive',
  outline: 'border border-border text-foreground',
}

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: VarianteBadge
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  function Badge({ className, variant = 'neutral', ...props }, ref) {
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
          VARIANTES[variant],
          className,
        )}
        {...props}
      />
    )
  },
)
