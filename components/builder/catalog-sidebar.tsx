'use client'

import { useState, useTransition, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { searchExercises, addPrescriptionItem, getMuscles } from '@/app/(app)/periodizacoes/[periodizationId]/actions'
import { Search, Plus, Loader2 } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { ExercicioBusca, ItemTaxonomia } from '@/lib/types/dominio'

/** Etiqueta de anotacao contextual do resultado de busca. */
function Anotacao({
  titulo,
  className,
  children,
}: {
  titulo: string
  className: string
  children: React.ReactNode
}) {
  return (
    <span
      title={titulo}
      className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${className}`}
    >
      {children}
    </span>
  )
}

interface CatalogSidebarProps {
  activeSessionId: string
  /** Aluno da periodizacao — habilita as anotacoes de restricao e equipamento. */
  clientId?: string | null
  /** Microciclo atual — habilita a anotacao "ja prescrito". */
  microcycleId?: string | null
}

export function CatalogSidebar({
  activeSessionId,
  clientId,
  microcycleId,
}: CatalogSidebarProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ExercicioBusca[]>([])
  const [muscles, setMuscles] = useState<ItemTaxonomia[]>([])
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isAdding, setIsAdding] = useState<string | null>(null)
  const [buscaSimplificada, setBuscaSimplificada] = useState(false)

  const executarBusca = useCallback(
    (termo: string, muscleId: string | null) => {
      startTransition(async () => {
        const resultado = await searchExercises(termo, muscleId, {
          clientId,
          microcycleId,
        })
        setResults(resultado.data || [])
        setBuscaSimplificada(Boolean(resultado.buscaSimplificada))
      })
    },
    [clientId, microcycleId],
  )

  // Carga inicial: lista o catalogo e os musculos para o filtro.
  useEffect(() => {
    executarBusca('', null)
    startTransition(async () => {
      const { data: musclesData } = await getMuscles()
      setMuscles(musclesData || [])
    })
  }, [executarBusca])

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    executarBusca(query, selectedMuscle)
  }

  // Re-busca quando o filtro de musculo muda.
  useEffect(() => {
    executarBusca(query, selectedMuscle)
    // `query` de proposito fora das deps: o termo digitado so e aplicado no
    // submit do formulario, nao a cada tecla.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMuscle, executarBusca])

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
        <form onSubmit={handleSearch} className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Input 
              placeholder="Ex: Supino..." 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="bg-zinc-900 border-zinc-800 text-zinc-100"
            />
            <Button type="submit" disabled={isPending} size="icon" className="shrink-0 bg-amber-500 text-zinc-950 hover:bg-amber-600">
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </Button>
          </div>
          
          <select 
            value={selectedMuscle || ''} 
            onChange={(e) => setSelectedMuscle(e.target.value || null)}
            className="h-9 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-500 text-zinc-100"
          >
            <option value="">Todos os músculos</option>
            {muscles.map((m) => (
              <option key={m.id} value={m.id}>{m.name_pt}</option>
            ))}
          </select>
        </form>

        {/* Sinaliza, apenas em desenvolvimento, que a RPC da 0010 nao respondeu
            e a busca caiu no modo simplificado. */}
        {buscaSimplificada && process.env.NODE_ENV !== 'production' && (
          <p className="mt-2 text-[11px] text-amber-500/80">
            Busca simplificada — migration 0010 pendente (sem acento, typo ou
            anotações). Ver docs/MIGRATIONS.md.
          </p>
        )}
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
                <div className="min-w-0">
                  <p className="font-medium text-sm text-zinc-100 leading-tight">{exercise.name_pt}</p>
                  {!!exercise.aliases_pt?.length && (
                    <p className="text-xs text-zinc-500 mt-1 line-clamp-1">{exercise.aliases_pt?.join(', ')}</p>
                  )}
                  {!!exercise.primary_muscle && (
                    <p className="text-xs text-zinc-500 mt-1 line-clamp-1">
                      {exercise.primary_muscle}
                      {exercise.movement_pattern ? ` · ${exercise.movement_pattern}` : ''}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-1 mt-2 empty:hidden">
                    {exercise.has_restriction && (
                      <Anotacao
                        titulo="Padrão de movimento restrito na anamnese do aluno"
                        className="bg-red-500/10 text-red-400 border-red-500/20"
                      >
                        Restrito
                      </Anotacao>
                    )}
                    {exercise.missing_equipment && (
                      <Anotacao
                        titulo="O aluno não tem todo o equipamento exigido"
                        className="bg-amber-500/10 text-amber-500 border-amber-500/20"
                      >
                        Sem equipamento
                      </Anotacao>
                    )}
                    {exercise.already_prescribed && (
                      <Anotacao
                        titulo="Já prescrito em outro treino desta semana"
                        className="bg-sky-500/10 text-sky-400 border-sky-500/20"
                      >
                        Já prescrito
                      </Anotacao>
                    )}
                  </div>
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
