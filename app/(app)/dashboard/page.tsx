import type { Metadata } from 'next'
import { CabecalhoPagina } from '@/components/layout/cabecalho-pagina'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Activity, Target, Flame } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Dashboard | Periodiza',
}

export default function PaginaDashboard() {
  return (
    <div className="flex flex-col gap-8">
      <CabecalhoPagina
        titulo="Dashboard"
        descricao="Visão geral dos seus alunos, periodizações em andamento e aderência da semana."
      />

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-zinc-950 border-zinc-800 shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">
              Alunos Ativos
            </CardTitle>
            <Users className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-50">12</div>
            <p className="text-xs text-zinc-500 mt-1">
              +2 desde o último mês
            </p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-950 border-zinc-800 shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">
              Periodizações Ativas
            </CardTitle>
            <Target className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-50">15</div>
            <p className="text-xs text-zinc-500 mt-1">
              3 terminam nesta semana
            </p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-950 border-zinc-800 shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">
              Aderência (Semana)
            </CardTitle>
            <Activity className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-50">84%</div>
            <p className="text-xs text-zinc-500 mt-1">
              +5% em relação à semana passada
            </p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-950 border-zinc-800 shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">
              Treinos Realizados
            </CardTitle>
            <Flame className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-50">42</div>
            <p className="text-xs text-zinc-500 mt-1">
              Últimos 7 dias
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 bg-zinc-950 border-zinc-800 shadow-xl">
          <CardHeader>
            <CardTitle className="text-zinc-50">Aderência Recente</CardTitle>
            <CardDescription className="text-zinc-400">
              Desempenho dos alunos nos treinos propostos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full flex items-center justify-center border border-dashed border-zinc-800 rounded-lg">
              <span className="text-zinc-500 text-sm">Gráfico de aderência em breve...</span>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3 bg-zinc-950 border-zinc-800 shadow-xl">
          <CardHeader>
            <CardTitle className="text-zinc-50">Alertas de Vencimento</CardTitle>
            <CardDescription className="text-zinc-400">
              Macrociclos e planos que exigem sua atenção
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4 border-l-2 border-amber-500 pl-4 py-1">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-zinc-200">João Silva</span>
                  <span className="text-xs text-zinc-500">Hipertrofia Fase 2 - Vence em 3 dias</span>
                </div>
              </div>
              <div className="flex items-center gap-4 border-l-2 border-red-500 pl-4 py-1">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-zinc-200">Maria Oliveira</span>
                  <span className="text-xs text-zinc-500">Transição (Deload) - Venceu ontem</span>
                </div>
              </div>
              <div className="flex items-center gap-4 border-l-2 border-amber-500 pl-4 py-1">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-zinc-200">Carlos Pereira</span>
                  <span className="text-xs text-zinc-500">Emagrecimento - Vence em 5 dias</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
