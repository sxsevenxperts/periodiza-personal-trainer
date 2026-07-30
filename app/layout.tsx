import type { ReactNode } from 'react'
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'

import { Providers } from '@/components/providers'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: {
    default: 'Periodiza — periodização de treinos',
    template: '%s · Periodiza',
  },
  description:
    'Plataforma para personal trainers montarem periodizações de treino com catálogo canônico de exercícios, prescrição por sessão e acompanhamento da execução do aluno.',
  applicationName: 'Periodiza',
  authors: [{ name: 'Periodiza' }],
  keywords: [
    'periodização',
    'treino',
    'personal trainer',
    'prescrição de exercícios',
    'musculação',
  ],
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0b1220' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="pt-BR" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-dvh bg-background font-sans text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
