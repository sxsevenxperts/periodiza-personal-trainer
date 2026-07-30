import type { ReactNode } from 'react'
import Link from 'next/link'

import { NavLateral } from '@/components/layout/nav-lateral'

export default function LayoutApp({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <aside className="border-b border-border bg-card lg:sticky lg:top-0 lg:h-dvh lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r">
        <div className="flex h-full flex-col gap-6 p-4">
          <Link
            href="/dashboard"
            className="px-2 text-lg font-semibold tracking-tight"
          >
            Periodiza
          </Link>
          <NavLateral />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
          {children}
        </main>
      </div>
    </div>
  )
}
