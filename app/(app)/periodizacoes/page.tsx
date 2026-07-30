import type { Metadata } from 'next'
import Link from 'next/link'
import { CabecalhoPagina } from '@/components/layout/cabecalho-pagina'
import { Button } from '@/components/ui/button'
import { PlusCircle, Target, CalendarDays, ArrowRight } from 'lucide-react'
import { NovaPeriodizacaoDialog } from '@/components/periodizacoes/nova-periodizacao-dialog'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

import { getAlunos } from '@/app/(app)/alunos/actions'

export const metadata: Metadata = {
  title: 'Periodizações | Periodiza',
}

// TODO(db): buscar dados reais do banco
const MOCK_PERIODIZACOES = [
  {
    id: '123',
    nome: 'Hipertrofia Fase 2',
    aluno: 'João Silva',
    objetivo: 'Hipertrofia',
    split: 'ABC',
    status: 'em_andamento',
    semanas: 8,
    semanaAtual: 3,
  },
  {
    id: '124',
    nome: 'Emagrecimento - Início',
    aluno: 'Carlos Pereira',
    objetivo: 'Emagrecimento',
    split: 'AB',
    status: 'pendente',
    semanas: 4,
    semanaAtual: 0,
  }
]

export default async function PaginaPeriodizacoes() {
  const alunos = await getAlunos()

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <CabecalhoPagina
          titulo="Periodizações"
          descricao="Macrociclos, mesociclos e microciclos de cada aluno, com a divisão de treinos e a fase atual."
        />
        <NovaPeriodizacaoDialog alunos={alunos} />
      </div>

      <div className="flex flex-col gap-4">
        {MOCK_PERIODIZACOES.map((periodizacao) => (
          <Card key={periodizacao.id} className="bg-zinc-950 border-zinc-800 shadow-xl overflow-hidden hover:border-zinc-700 transition-colors">
            <CardContent className="p-0">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 gap-4">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-zinc-50">{periodizacao.nome}</h3>
                    {periodizacao.status === 'em_andamento' ? (
                      <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20">Em Andamento</Badge>
                    ) : (
                      <Badge variant="outline" className="text-zinc-400 border-zinc-700">Pendente</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-zinc-400">
                    <span className="flex items-center gap-1">
                      <Target className="w-4 h-4" /> {periodizacao.aluno}
                    </span>
                    <span className="flex items-center gap-1">
                      <CalendarDays className="w-4 h-4" /> Semana {periodizacao.semanaAtual}/{periodizacao.semanas}
                    </span>
                    <span className="bg-zinc-800 px-2 py-0.5 rounded text-zinc-300 font-mono text-xs">
                      Divisão {periodizacao.split}
                    </span>
                  </div>
                </div>
                
                <Button asChild variant="secondary" className="w-full sm:w-auto gap-2 bg-zinc-800 text-zinc-100 hover:bg-zinc-700">
                  <Link href={`/periodizacoes/${periodizacao.id}`}>
                    Ver Builder <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
