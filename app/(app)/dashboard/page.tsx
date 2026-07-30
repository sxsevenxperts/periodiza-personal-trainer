import type { Metadata } from 'next'

import { CabecalhoPagina } from '@/components/layout/cabecalho-pagina'

export const metadata: Metadata = {
  title: 'Dashboard',
}

// TODO(dashboard): carregar os indicadores do treinador logado —
// alunos ativos, periodizações em andamento, microciclos que vencem na semana,
// aderência (workout_executions concluídas / prescritas) e alertas de deload.
export default function PaginaDashboard() {
  return (
    <>
      <CabecalhoPagina
        titulo="Dashboard"
        descricao="Visão geral dos seus alunos, periodizações em andamento e aderência da semana."
      />
      <p className="text-sm text-muted-foreground">
        Indicadores serão exibidos aqui.
      </p>
    </>
  )
}
