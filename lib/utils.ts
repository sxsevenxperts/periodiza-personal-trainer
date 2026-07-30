import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Junta classes condicionais (clsx) e resolve conflitos de utilitarios do
 * Tailwind (tailwind-merge). Use em todo componente que aceita `className`.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
