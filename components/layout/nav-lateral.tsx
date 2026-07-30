'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BookOpen,
  Dumbbell,
  LayoutDashboard,
  LayoutTemplate,
  Settings,
  Users,
  type LucideIcon,
} from 'lucide-react'

import { cn } from '@/lib/utils'

interface ItemDeNavegacao {
  href: string
  rotulo: string
  icone: LucideIcon
}

export const ITENS_DE_NAVEGACAO: readonly ItemDeNavegacao[] = [
  { href: '/dashboard', rotulo: 'Dashboard', icone: LayoutDashboard },
  { href: '/alunos', rotulo: 'Alunos', icone: Users },
  { href: '/periodizacoes', rotulo: 'Periodizações', icone: Dumbbell },
  { href: '/catalogo', rotulo: 'Catálogo', icone: BookOpen },
  { href: '/modelos', rotulo: 'Modelos', icone: LayoutTemplate },
  { href: '/configuracoes', rotulo: 'Configurações', icone: Settings },
]

function estaAtivo(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function NavLateral() {
  const pathname = usePathname()

  return (
    <nav aria-label="Navegação principal" className="flex flex-col gap-1">
      {ITENS_DE_NAVEGACAO.map(({ href, rotulo, icone: Icone }) => {
        const ativo = estaAtivo(pathname, href)

        return (
          <Link
            key={href}
            href={href}
            aria-current={ativo ? 'page' : undefined}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              ativo
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <Icone className="h-4 w-4 shrink-0" aria-hidden="true" />
            {rotulo}
          </Link>
        )
      })}
    </nav>
  )
}
