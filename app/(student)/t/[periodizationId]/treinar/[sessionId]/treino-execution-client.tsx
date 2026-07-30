'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Check, CheckCircle2, Loader2, Video } from 'lucide-react'
import { finishSession } from './actions'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ItemExecucao, SessaoExecucao } from '@/lib/types/dominio'

interface TreinoExecutionClientProps {
  session: SessaoExecucao
  periodizationId: string
  sessionId: string
}

export function TreinoExecutionClient({ session, periodizationId, sessionId }: TreinoExecutionClientProps) {
  const items = session.prescription_items || []
  const [activeItem, setActiveItem] = useState(0)
  const [completedSets, setCompletedSets] = useState<Record<string, boolean[]>>({})
  const [isPending, startTransition] = useTransition()

  // Initialize sets tracking
  if (Object.keys(completedSets).length === 0 && items.length > 0) {
    const initial: Record<string, boolean[]> = {}
    items.forEach((item: ItemExecucao) => {
      initial[item.id] = Array(item.series || 3).fill(false)
    })
    setCompletedSets(initial)
  }

  const toggleSet = (itemId: string, setIndex: number) => {
    setCompletedSets(prev => {
      const updated = { ...prev }
      updated[itemId] = [...(updated[itemId] || [])]
      updated[itemId][setIndex] = !updated[itemId][setIndex]
      return updated
    })
  }

  const handleFinish = () => {
    startTransition(async () => {
      await finishSession(sessionId, periodizationId)
    })
  }

  if (items.length === 0) {
    return <p className="text-zinc-500 text-center py-8">Nenhum exercício prescrito para este treino.</p>
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex overflow-x-auto gap-2 pb-2 snap-x scrollbar-none -mx-4 px-4">
        {items.map((item: ItemExecucao, idx: number) => (
          <button
            key={item.id}
            onClick={() => setActiveItem(idx)}
            className={`snap-center shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${
              activeItem === idx 
                ? 'bg-amber-500 text-zinc-950' 
                : 'bg-zinc-900 border border-zinc-800 text-zinc-400'
            }`}
          >
            {idx + 1}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-6">
        {items.map((item: ItemExecucao, idx: number) => (
          <div key={item.id} className={`${activeItem === idx ? 'block' : 'hidden'} animate-in fade-in slide-in-from-right-4 duration-300`}>
            
            <div className="mb-6 border-b border-zinc-800 pb-4">
              <div className="flex justify-between items-start gap-4 mb-2">
                <h2 className="text-xl font-bold text-zinc-50 leading-tight">
                  {idx + 1}. {item.exercises?.name_pt}
                </h2>
                {item.exercises?.video_url && (
                  <Button variant="outline" size="icon" className="shrink-0 rounded-full bg-zinc-900 border-zinc-800 text-amber-500 hover:text-amber-400">
                    <Video className="w-4 h-4" />
                  </Button>
                )}
              </div>
              
              <div className="flex flex-wrap gap-2 mt-4">
                <div className="bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 flex flex-col items-center flex-1 min-w-[80px]">
                  <span className="text-xs text-zinc-500 mb-0.5">Séries</span>
                  <span className="font-bold text-zinc-200">{item.series}</span>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 flex flex-col items-center flex-1 min-w-[80px]">
                  <span className="text-xs text-zinc-500 mb-0.5">Reps</span>
                  <span className="font-bold text-zinc-200">{item.reps_min}-{item.reps_max}</span>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 flex flex-col items-center flex-1 min-w-[80px]">
                  <span className="text-xs text-zinc-500 mb-0.5">Carga (kg)</span>
                  <span className="font-bold text-zinc-200">{item.load_kg || '--'}</span>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 flex flex-col items-center flex-1 min-w-[80px]">
                  <span className="text-xs text-zinc-500 mb-0.5">Descanso</span>
                  <span className="font-bold text-zinc-200">{item.rest_seconds}s</span>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 flex flex-col items-center flex-1 min-w-[80px]">
                  <span className="text-xs text-zinc-500 mb-0.5">RIR / RPE</span>
                  <span className="font-bold text-zinc-200">{item.rir_target ?? '--'} / {item.rpe_target ?? '--'}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-zinc-300">Registrar Séries</h3>
              
              <div className="flex flex-col gap-3">
                {Array.from({ length: item.series ?? 3 }).map((_, setIdx) => {
                  const isCompleted = completedSets[item.id]?.[setIdx] || false;
                  
                  return (
                    <div key={setIdx} className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                      isCompleted ? 'bg-amber-500/10 border-amber-500/30' : 'bg-zinc-900 border-zinc-800'
                    }`}>
                      <button 
                        onClick={() => toggleSet(item.id, setIdx)}
                        className={`shrink-0 flex items-center justify-center w-8 h-8 rounded-full transition-colors ${
                          isCompleted ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'
                        }`}
                      >
                        {isCompleted ? <Check className="w-5 h-5" /> : <span>{setIdx + 1}</span>}
                      </button>
                      
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <div className="flex flex-col">
                          <Label className="text-[10px] text-zinc-500 mb-1 ml-1">Reps Feitas</Label>
                          <Input 
                            type="number" 
                            placeholder={`${item.reps_min}-${item.reps_max}`} 
                            className="h-8 bg-zinc-950 border-zinc-800 text-zinc-200" 
                          />
                        </div>
                        <div className="flex flex-col">
                          <Label className="text-[10px] text-zinc-500 mb-1 ml-1">Carga Usada</Label>
                          <Input 
                            type="number" 
                            placeholder={item.load_kg?.toString() || '0'} 
                            className="h-8 bg-zinc-950 border-zinc-800 text-zinc-200" 
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="mt-8 flex justify-between gap-4">
              <Button 
                variant="outline" 
                onClick={() => setActiveItem(prev => Math.max(0, prev - 1))}
                disabled={activeItem === 0}
                className="flex-1 border-zinc-800 bg-zinc-900 text-zinc-300 hover:text-zinc-50 hover:bg-zinc-800"
              >
                Anterior
              </Button>
              {activeItem < items.length - 1 ? (
                <Button 
                  onClick={() => setActiveItem(prev => Math.min(items.length - 1, prev + 1))}
                  className="flex-1 bg-amber-500 text-zinc-950 hover:bg-amber-600"
                >
                  Próximo
                </Button>
              ) : (
                <Button 
                  onClick={handleFinish}
                  disabled={isPending}
                  className="flex-1 bg-green-500 text-zinc-950 hover:bg-green-600"
                >
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                  Finalizar Treino
                </Button>
              )}
            </div>

          </div>
        ))}
      </div>
    </div>
  )
}
