import type { Metadata } from 'next'

import { CabecalhoPagina } from '@/components/layout/cabecalho-pagina'

export const metadata: Metadata = {
  title: 'Modelos',
}

// TODO(modelos): modelos reutilizáveis de periodização e de microciclo —
// criar a partir de uma periodização existente, aplicar a um aluno e manter
// os modelos padrão do produto separados dos modelos do treinador.
export default function PaginaModelos() {
  return (
    <>
      <CabecalhoPagina
        titulo="Modelos"
        descricao="Estruturas de periodização e de microciclo prontas para aplicar em novos alunos."
      />
      <p className="text-sm text-muted-foreground">
        Os modelos serão exibidos aqui.
      </p>
    </>
  )
}
