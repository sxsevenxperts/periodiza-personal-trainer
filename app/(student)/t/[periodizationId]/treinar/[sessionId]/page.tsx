import { notFound } from 'next/navigation'
import { getSessionExecutionData } from './actions'
import { TreinoExecutionClient } from './treino-execution-client'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { SessaoExecucao } from '@/lib/types/dominio'

interface PageProps {
  params: Promise<{ periodizationId: string; sessionId: string }>
}

export default async function TreinoPage({ params }: PageProps) {
  const { periodizationId, sessionId } = await params
  
  const session = await getSessionExecutionData(sessionId)

  if (!session) {
    notFound()
  }

  return (
    <div className="flex flex-col min-h-screen bg-zinc-950">
      <div className="p-4 border-b border-zinc-900 sticky top-14 bg-zinc-950/80 backdrop-blur-sm z-40 flex items-center gap-3">
        <Link href={`/t/${periodizationId}`} className="text-zinc-400 hover:text-zinc-100 p-2 -ml-2">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-zinc-50">{session.name}</h1>
          <p className="text-xs text-amber-500">Treino {session.label}</p>
        </div>
      </div>

      <div className="flex-1 p-4 pb-24">
        {session.status === 'concluida' ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mb-4 text-2xl">
              🎉
            </div>
            <h2 className="text-xl font-bold text-zinc-100 mb-2">Treino Concluído!</h2>
            <p className="text-zinc-400 max-w-[250px] mx-auto mb-6">
              Muito bem, você completou este treino. Descanse e prepare-se para o próximo.
            </p>
            <Link 
              href={`/t/${periodizationId}`}
              className="bg-zinc-800 text-zinc-100 px-6 py-2 rounded-md hover:bg-zinc-700"
            >
              Voltar ao Início
            </Link>
          </div>
        ) : (
          /* Cast na fronteira: ver nota em app/(app)/catalogo/page.tsx —
             prescription_items.exercises e objeto em runtime, nao array. */
          <TreinoExecutionClient 
            session={session as unknown as SessaoExecucao} 
            periodizationId={periodizationId}
            sessionId={sessionId}
          />
        )}
      </div>
    </div>
  )
}
