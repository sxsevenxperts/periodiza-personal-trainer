import type { Metadata } from 'next'
import type { LucideIcon } from 'lucide-react'
import { Users, Activity, Target, Flame } from 'lucide-react'

import { CabecalhoPagina } from '@/components/layout/cabecalho-pagina'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getIndicadoresDashboard } from './actions'

export const metadata: Metadata = {
  title: 'Dashboard | Periodiza',
}

/**
 * Cartao de indicador.
 *
 * `valor === null` distingue "ainda nao implementado" de "zero". Mostrar `0`
 * onde o dado nao existe seria inventar informacao — e foi exatamente o que a
 * versao anterior desta pagina fazia ao codificar 12 alunos e 84% de aderencia
 * direto no JSX.
 */
function CartaoIndicador({
  titulo,
  valor,
  icone: Icone,
  corDoIcone,
  pendente,
}: {
  titulo: string
  valor: number | null
  icone: LucideIcon
  corDoIcone: string
  pendente?: string
}) {
  return (
    <Card className="bg-zinc-950 border-zinc-800 shadow-xl">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-zinc-400">{titulo}</CardTitle>
        <Icone className={`h-4 w-4 ${corDoIcone}`} />
      </CardHeader>
      <CardContent>
        {valor === null ? (
          <>
            <div className="text-2xl font-bold text-zinc-600">—</div>
            <p className="text-xs text-zinc-500 mt-1">{pendente ?? 'Indisponível'}</p>
          </>
        ) : (
          <div className="text-2xl font-bold text-zinc-50">{valor}</div>
        )}
      </CardContent>
    </Card>
  )
}

export default async function PaginaDashboard() {
  const indicadores = await getIndicadoresDashboard()

  return (
    <div className="flex flex-col gap-8">
      <CabecalhoPagina
        titulo="Dashboard"
        descricao="Visão geral dos seus alunos, periodizações em andamento e aderência da semana."
      />

      {indicadores.erro && (
        <p role="alert" className="text-sm text-red-400">
          {indicadores.erro}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <CartaoIndicador
          titulo="Alunos ativos"
          valor={indicadores.alunosAtivos}
          icone={Users}
          corDoIcone="text-amber-500"
        />
        <CartaoIndicador
          titulo="Periodizações ativas"
          valor={indicadores.periodizacoesAtivas}
          icone={Target}
          corDoIcone="text-amber-500"
        />
        <CartaoIndicador
          titulo="Aderência (semana)"
          valor={indicadores.aderenciaSemanal}
          icone={Activity}
          corDoIcone="text-emerald-500"
          pendente="Disponível quando o registro de execução entrar"
        />
        <CartaoIndicador
          titulo="Treinos realizados"
          valor={indicadores.treinosRealizados}
          icone={Flame}
          corDoIcone="text-orange-500"
          pendente="Disponível quando o registro de execução entrar"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 bg-zinc-950 border-zinc-800 shadow-xl">
          <CardHeader>
            <CardTitle className="text-zinc-50">Aderência recente</CardTitle>
            <CardDescription className="text-zinc-400">
              Desempenho dos alunos nos treinos propostos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full flex items-center justify-center border border-dashed border-zinc-800 rounded-lg">
              <span className="text-zinc-500 text-sm px-4 text-center">
                Depende do registro de execução dos treinos.
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3 bg-zinc-950 border-zinc-800 shadow-xl">
          <CardHeader>
            <CardTitle className="text-zinc-50">Alertas de vencimento</CardTitle>
            <CardDescription className="text-zinc-400">
              Macrociclos e planos que exigem sua atenção
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full flex items-center justify-center border border-dashed border-zinc-800 rounded-lg">
              <span className="text-zinc-500 text-sm px-4 text-center">
                Depende do acompanhamento de datas das periodizações.
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
