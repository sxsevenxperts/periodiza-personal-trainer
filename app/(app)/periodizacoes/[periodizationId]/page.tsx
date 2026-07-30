import type { Metadata } from 'next'

import { CabecalhoPagina } from '@/components/layout/cabecalho-pagina'

export const metadata: Metadata = {
  title: 'Builder de treinos',
}

// Next 15: `params` é uma Promise e precisa de await.
interface PaginaPeriodizacaoProps {
  params: Promise<{ periodizationId: string }>
}

// TODO(builder): implementar a SPEC-01 — abas Treino A a G por microciclo,
// busca de exercício no catálogo com sinalização contextual do aluno,
// seletor "Adicionar em: [Treino X]", mover/copiar item entre treinos e
// prescrição pré-preenchida pelo motor.
export default async function PaginaPeriodizacao({
  params,
}: PaginaPeriodizacaoProps) {
  const { periodizationId } = await params

  return (
    <>
      <CabecalhoPagina
        titulo="Builder de treinos"
        descricao="Monte os treinos A a G do microciclo, busque exercícios no catálogo e ajuste a prescrição."
      />
      <p className="text-sm text-muted-foreground">
        Periodização{' '}
        <code className="font-mono text-foreground">{periodizationId}</code>. O
        builder será exibido aqui.
      </p>
    </>
  )
}
