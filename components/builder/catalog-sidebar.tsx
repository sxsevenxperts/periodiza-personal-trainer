'use client'

import { useState, useTransition, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { searchExercises, addPrescriptionItem } from '@/app/(app)/periodizacoes/[periodizationId]/actions'
import { Search, Plus, Loader2 } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'

export function CatalogSidebar({ activeSessionId }: { activeSessionId: string }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [isPending, startTransition] = useTransition()
  const [isAdding, setIsAdding] = useState<string | null>(null)

  // Load initial results (empty query)
  useEffect(() => {
    startTransition(async () => {
      const { data } = await searchExercises('')
      setResults(data || [])
    })
  }, [])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const { data } = await searchExercises(query)
      setResults(data || [])
    })
  }

  const handleAdd = async (exerciseId: string) => {
    if (!activeSessionId) return
    setIsAdding(exerciseId)
    await addPrescriptionItem(activeSessionId, exerciseId)
    setIsAdding(null)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] border rounded-lg bg-zinc-950 border-zinc-800 overflow-hidden">
      <div className="p-4 border-b border-zinc-800 bg-zinc-900/50">
        <h3 className="font-semibold text-lg text-zinc-50 mb-4">Catálogo</h3>
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input 
            placeholder="Ex: Supino..." 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="bg-zinc-900 border-zinc-800 text-zinc-100"
          />
          <Button type="submit" disabled={isPending} size="icon" className="shrink-0 bg-amber-500 text-zinc-950 hover:bg-amber-600">
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </Button>
        </form>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="flex flex-col gap-3">
          {results.length === 0 && !isPending && (
            <p className="text-center text-sm text-zinc-500 py-8">
              Nenhum exercício encontrado.
            </p>
          )}
          {results.map((exercise) => (
            <div 
              key={exercise.id} 
              className="group flex flex-col p-3 border border-zinc-800 rounded-lg bg-zinc-900/30 hover:border-amber-500/50 hover:bg-zinc-900/80 transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-sm text-zinc-100 leading-tight">{exercise.name_pt}</p>
                  {exercise.aliases_pt?.length > 0 && (
                    <p className="text-xs text-zinc-500 mt-1 line-clamp-1">{exercise.aliases_pt.join(', ')}</p>
                  )}
                </div>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  onClick={() => handleAdd(exercise.id)}
                  disabled={isAdding === exercise.id || !activeSessionId}
                  className="shrink-0 text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                  title="Adicionar ao treino atual"
                >
                  {isAdding === exercise.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
