import type { ReactNode } from 'react'
import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'

import { Providers } from '@/components/providers'
import './globals.css'

/**
 * Inter servida do proprio repositorio, e nao via `next/font/google`.
 *
 * `next/font/google` BAIXA a fonte durante o `next build`. Num build de
 * container isso transforma `fonts.googleapis.com` em dependencia obrigatoria
 * do deploy: se a rede do builder nao alcancar o Google, o build inteiro falha
 * — e o build e exatamente onde este projeto vinha travando.
 *
 * O arquivo e o subset `latin` da Inter variavel (48 KB), cujo unicode-range
 * (U+0000-00FF) cobre todos os acentos do portugues. Peso 100–900 numa fonte
 * variavel unica, entao nao ha arquivo por peso.
 */
const inter = localFont({
  src: './fonts/inter-latin-var.woff2',
  weight: '100 900',
  style: 'normal',
  display: 'swap',
  variable: '--font-inter',
  // Metricas da Inter, para o texto nao "pular" quando a fonte carrega.
  fallback: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
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
