import type { Metadata } from 'next'

import { CabecalhoPagina } from '@/components/layout/cabecalho-pagina'

export const metadata: Metadata = {
  title: 'Periodizações',
}

// TODO(periodizacoes): listar as periodizações do treinador com aluno,
// objetivo, split (A a ABCDEFG), data de início, semana atual do macrociclo e
// status, além da ação de criar periodização a partir de um modelo.
export default function PaginaPeriodizacoes() {
  return (
    <>
      <CabecalhoPagina
        titulo="Periodizações"
        descricao="Macrociclos, mesociclos e microciclos de cada aluno, com a divisão de treinos e a fase atual."
      />
      <p className="text-sm text-muted-foreground">
        A lista de periodizações será exibida aqui.
      </p>
    </>
  )
}
