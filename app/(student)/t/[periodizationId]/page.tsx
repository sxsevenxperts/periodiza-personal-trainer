import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getStudentPeriodization } from './actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PlayCircle, Calendar, Clock, ArrowRight } from 'lucide-react'

interface PageProps {
  params: Promise<{ periodizationId: string }>
}

export default async function StudentDashboardPage({ params }: PageProps) {
  const { periodizationId } = await params
  
  const periodization = await getStudentPeriodization(periodizationId)

  if (!periodization) {
    notFound()
  }

  // Encontrar o mesociclo e microciclo atual (simplificado para MVP: pegar o primeiro)
  const currentMeso = periodization.mesocycles?.[0]
  const currentMicro = currentMeso?.microcycles?.[0]
  const sessions = currentMicro?.sessions || []

  return (
    <div className="flex flex-col gap-6 p-4 pb-20">
      <div className="space-y-1">
        <p className="text-amber-500 font-medium">Olá, {periodization.clients?.name}</p>
        <h1 className="text-2xl font-bold text-zinc-50">{periodization.name}</h1>
        <p className="text-zinc-400 text-sm">
          {currentMeso?.name} • Semana {currentMicro?.week_number}
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-amber-500" /> 
          Treinos da Semana
        </h2>
        
        <div className="flex flex-col gap-3">
          {sessions.length === 0 && (
            <p className="text-zinc-500 text-center py-8">Nenhum treino planejado para esta semana.</p>
          )}
          
          {sessions.map((session: any) => (
            <Card key={session.id} className="bg-zinc-900 border-zinc-800 overflow-hidden">
              <CardContent className="p-0">
                <Link href={`/t/${periodizationId}/treinar/${session.id}`} className="flex flex-col p-4 hover:bg-zinc-800/50 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-3">
                      <div className="bg-zinc-800 text-zinc-300 w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg">
                        {session.label}
                      </div>
                      <div>
                        <h3 className="font-semibold text-zinc-100">{session.name}</h3>
                        <p className="text-xs text-zinc-400 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          {session.estimated_duration_min || 60} min
                        </p>
                      </div>
                    </div>
                    {session.status === 'concluida' ? (
                      <span className="text-xs font-medium bg-green-500/20 text-green-400 px-2 py-1 rounded">
                        Concluído
                      </span>
                    ) : (
                      <span className="text-xs font-medium bg-zinc-800 text-zinc-300 px-2 py-1 rounded">
                        Pendente
                      </span>
                    )}
                  </div>
                  
                  <div className="mt-2 flex items-center justify-between text-amber-500 text-sm font-medium">
                    {session.status === 'concluida' ? 'Ver Detalhes' : 'Começar Treino'}
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
