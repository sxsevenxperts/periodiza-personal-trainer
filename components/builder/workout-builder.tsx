'use client'

import { useState, useEffect, useCallback } from 'react'
import { GripVertical, X, Copy, Move } from 'lucide-react'
import { TreinoBuildHeader, type SessionTab } from '@/app/components/treino-builder/treino-builder-header'
import { ExerciseSearch, type ExerciseFilter } from '@/app/components/treino-builder/exercise-search'
import {
  searchExercises,
  addPrescriptionItem,
  deletePrescriptionItem,
  movePrescriptionItem,
  copyPrescriptionItem,
} from '@/app/actions/exercise-actions'
import { toast } from 'sonner'

interface Exercise {
  id: string
  name_pt: string
  primary_muscle_id?: string
}

interface PrescriptionItem {
  id: string
  session_id: string
  order_index: number
  series: number
  reps_min: number
  reps_max: number
  load_kg: number
  rest_seconds: number
  exercises: Exercise
}

interface WorkoutBuilderProps {
  periodizationId?: string
  split: string
  sessions: Array<{ id: string; label: string; name: string }>
  prescriptionItems: PrescriptionItem[]
}

export function WorkoutBuilder({
  split,
  sessions: initialSessions,
  prescriptionItems: initialPrescriptionItems,
}: WorkoutBuilderProps) {
  // State
  const [activeSessionLabel, setActiveSessionLabel] = useState<string>(
    initialSessions[0]?.label || 'A'
  )
  const [prescriptionItems, setPrescriptionItems] = useState<
    Map<string, PrescriptionItem[]>
  >(
    new Map(
      initialSessions.map((s) => [
        s.label,
        initialPrescriptionItems.filter((p) => {
          const session = initialSessions.find((ss) => ss.id === p.session_id)
          return session?.label === s.label
        }),
      ])
    )
  )
  const [searchResults, setSearchResults] = useState<Array<Exercise & { notes?: string[] }>>([])
  const [isSearching, setIsSearching] = useState(false)
  const [filters, setFilters] = useState<ExerciseFilter>({
    query: '',
    onlyAvailable: false,
  })
  const [draggedItem, setDraggedItem] = useState<{
    sessionLabel: string
    itemId: string
  } | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  // Get session tabs for header
  const sessionTabs: SessionTab[] = initialSessions
    .slice(0, split === 'A' ? 1 : split === 'AB' ? 2 : split === 'ABC' ? 3 : 7)
    .map((s) => ({
      label: (s.label as 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G'),
      name: s.name || `Treino ${s.label}`,
      exerciseCount: prescriptionItems.get(s.label)?.length || 0,
      isActive: activeSessionLabel === s.label,
    }))

  const maxSessions = split === 'A' ? 1 : split === 'AB' ? 2 : split === 'ABC' ? 3 : 7

  // Search exercises on filter change
  useEffect(() => {
    const performSearch = async () => {
      if (filters.query.length < 2 && !filters.category && !filters.muscle && !filters.equipment) {
        setSearchResults([])
        return
      }

      setIsSearching(true)
      try {
        const results = await searchExercises({
          query: filters.query,
          categoryFilter: filters.category,
          movementFilter: filters.movement,
          muscleFilter: filters.muscle,
          equipmentFilter: filters.equipment,
        })
        setSearchResults(results || [])
      } catch (error) {
        console.error('Search error:', error)
        toast.error('Erro ao buscar exercícios')
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }

    const timer = setTimeout(performSearch, 300)
    return () => clearTimeout(timer)
  }, [filters])

  // Handle remove exercise
  const handleRemoveExercise = useCallback((sessionLabel: string, itemId: string) => {
    setPrescriptionItems((prev) => {
      const updated = new Map(prev)
      const items = updated.get(sessionLabel) || []
      updated.set(
        sessionLabel,
        items.filter((item) => item.id !== itemId)
      )
      return updated
    })

    // Call server action to delete from DB
    deletePrescriptionItem(itemId).catch((error) => {
      console.error('Delete error:', error)
      toast.error('Erro ao deletar exercício')
    })

    toast.success('Exercício removido')
  }, [])

  // Handle move exercise to another session
  const handleMoveExercise = useCallback(
    (fromLabel: string, itemId: string, toLabel: string) => {
      if (fromLabel === toLabel) return

      setPrescriptionItems((prev) => {
        const updated = new Map(prev)
        const fromItems = updated.get(fromLabel) || []
        const toItems = updated.get(toLabel) || []

        const itemToMove = fromItems.find((item) => item.id === itemId)
        if (!itemToMove) return prev

        updated.set(
          fromLabel,
          fromItems.filter((item) => item.id !== itemId)
        )
        updated.set(toLabel, [...toItems, itemToMove])

        return updated
      })

      // Get target session ID
      const targetSession = initialSessions.find((s) => s.label === toLabel)
      if (targetSession) {
        movePrescriptionItem(itemId, targetSession.id).catch((error) => {
          console.error('Move error:', error)
          toast.error('Erro ao mover exercício')
        })
      }

      toast.success(`Exercício movido para Treino ${toLabel}`)
    },
    [initialSessions]
  )

  // Handle copy exercise to another session
  const handleCopyExercise = useCallback(
    (fromLabel: string, itemId: string, toLabel: string) => {
      const targetSession = initialSessions.find((s) => s.label === toLabel)
      if (!targetSession) return

      // Call server action to copy
      copyPrescriptionItem(itemId, targetSession.id)
        .then((newItem) => {
          if (newItem && Array.isArray(newItem) && newItem.length > 0) {
            setPrescriptionItems((prev) => {
              const updated = new Map(prev)
              const toItems = updated.get(toLabel) || []
              updated.set(toLabel, [...toItems, newItem[0]])
              return updated
            })
            toast.success(`Exercício copiado para Treino ${toLabel}`)
          }
        })
        .catch((error) => {
          console.error('Copy error:', error)
          toast.error('Erro ao copiar exercício')
        })
    },
    [initialSessions]
  )

  // Handle add exercise
  const handleAddExercise = useCallback(
    async (exercise: Exercise, destinationLabel?: string) => {
      const targetLabel = destinationLabel || activeSessionLabel
      const currentLabel = activeSessionLabel

      try {
        const session = initialSessions.find((s) => s.label === targetLabel)
        if (!session) return

        // Call server action
        const newItem = await addPrescriptionItem(
          session.id,
          exercise.id,
          undefined,
          {
            series: 3,
            reps_min: 8,
            reps_max: 12,
            load_kg: 0,
            rest_seconds: 90,
          }
        )

        // Update local state
        if (newItem && Array.isArray(newItem) && newItem.length > 0) {
          setPrescriptionItems((prev) => {
            const updated = new Map(prev)
            const items = updated.get(targetLabel) || []
            updated.set(targetLabel, [...items, newItem[0]])
            return updated
          })
        }

        // Show toast if adding to different tab
        if (targetLabel !== currentLabel) {
          toast.success(`Exercício adicionado a Treino ${targetLabel}`, {
            description: 'Clique para desfazer',
            action: {
              label: 'Desfazer',
              onClick: () => {
                if (newItem && Array.isArray(newItem) && newItem.length > 0) {
                  handleRemoveExercise(targetLabel, newItem[0].id)
                }
              },
            },
          })
        } else {
          toast.success('Exercício adicionado!')
        }

        setFilters({ ...filters, query: '' })
        setSearchResults([])
      } catch (error) {
        console.error('Add exercise error:', error)
        toast.error('Erro ao adicionar exercício')
      }
    },
    [activeSessionLabel, initialSessions, filters, handleRemoveExercise]
  )

  // Handle drag start
  const handleDragStart = (sessionLabel: string, itemId: string) => {
    setDraggedItem({ sessionLabel, itemId })
  }

  // Handle drop on session tab (after moving between sessions)
  const _handleDropOnTab = (targetLabel: string) => {
    if (!draggedItem) return

    const { sessionLabel: sourceLabel, itemId } = draggedItem

    if (sourceLabel === targetLabel) {
      setDraggedItem(null)
      return
    }

    // Move item between sessions
    setPrescriptionItems((prev) => {
      const updated = new Map(prev)
      const sourceItems = updated.get(sourceLabel) || []
      const targetItems = updated.get(targetLabel) || []

      const itemToMove = sourceItems.find((item) => item.id === itemId)
      if (!itemToMove) return prev

      updated.set(
        sourceLabel,
        sourceItems.filter((item) => item.id !== itemId)
      )
      updated.set(targetLabel, [...targetItems, itemToMove])

      return updated
    })

    toast.success(`Exercício movido para Treino ${targetLabel}`)
    setDraggedItem(null)
  }

  // Get current session items
  const currentItems = prescriptionItems.get(activeSessionLabel) || []

  return (
    <div className="flex flex-col h-screen bg-neutral-950 rounded-lg overflow-hidden border border-neutral-800">
      {/* Header with tabs */}
      <div
        onDragOver={(e) => {
          e.preventDefault()
          e.dataTransfer.dropEffect = 'move'
        }}
      >
        <TreinoBuildHeader
          sessions={sessionTabs}
          onTabChange={(label) => setActiveSessionLabel(label)}
          onAddSession={() => {
            // If we reach max sessions, show error
            if (sessionTabs.length >= maxSessions) {
              toast.error(`Máximo de ${maxSessions} treino(s) para essa divisão`)
            }
          }}
          split={split}
          canAddMore={sessionTabs.length < maxSessions}
        />
      </div>

      {/* Search bar */}
      <ExerciseSearch
        filters={filters}
        onFilterChange={setFilters}
        categories={[]}
        movements={[]}
        muscles={[]}
        equipments={[]}
      />

      <div className="flex flex-1 min-h-0">
        {/* Search results */}
        <div className="w-1/3 border-r border-neutral-800 overflow-y-auto bg-neutral-900">
          <div className="p-4">
            {isSearching && (
              <div className="text-sm text-neutral-500 animate-pulse">Buscando...</div>
            )}

            {searchResults.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-3">
                  {searchResults.length} resultado(s)
                </h3>
                {searchResults.map((exercise) => (
                  <div
                    key={exercise.id}
                    className="p-3 bg-neutral-800 rounded-md hover:bg-neutral-700 transition-colors cursor-pointer group"
                    onClick={() => handleAddExercise(exercise, activeSessionLabel)}
                  >
                    <p className="text-sm font-medium text-neutral-100">{exercise.name_pt}</p>
                    {exercise.notes && exercise.notes.length > 0 && (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {exercise.notes.map((note, idx) => (
                          <span
                            key={idx}
                            className="text-xs px-2 py-1 bg-neutral-700 text-neutral-300 rounded"
                          >
                            {note}
                          </span>
                        ))}
                      </div>
                    )}
                    <button
                      className="mt-2 w-full py-1 bg-gradient-gold-h text-neutral-900 text-xs font-semibold rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleAddExercise(exercise, activeSessionLabel)
                      }}
                    >
                      Adicionar
                    </button>
                  </div>
                ))}
              </div>
            )}

            {!isSearching && filters.query && searchResults.length === 0 && (
              <div className="text-sm text-neutral-500 text-center py-8">
                Nenhum exercício encontrado
              </div>
            )}

            {!isSearching && !filters.query && (
              <div className="text-sm text-neutral-600 text-center py-8">
                Digite para buscar exercícios
              </div>
            )}
          </div>
        </div>

        {/* Session content */}
        <div className="flex-1 overflow-y-auto bg-neutral-950 p-4">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-neutral-100 mb-4">
              Treino {activeSessionLabel}
            </h2>

            {currentItems.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-neutral-500">Nenhum exercício adicionado</p>
                <p className="text-neutral-600 text-sm mt-2">Busque um exercício no painel à esquerda</p>
              </div>
            ) : (
              <div className="space-y-2">
                {currentItems.map((item, idx) => (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={() => handleDragStart(activeSessionLabel, item.id)}
                    className="group flex items-start gap-3 p-3 bg-neutral-800 rounded-md hover:bg-neutral-700 transition-colors border border-neutral-700 cursor-move"
                  >
                    <GripVertical size={18} className="text-neutral-600 mt-1 opacity-0 group-hover:opacity-100" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-neutral-100">
                        {idx + 1}. {item.exercises.name_pt}
                      </p>
                      <div className="flex gap-2 mt-1 text-xs text-neutral-400">
                        <span>{item.series} séries</span>
                        <span>×</span>
                        <span>
                          {item.reps_min}–{item.reps_max} reps
                        </span>
                        {item.load_kg > 0 && (
                          <>
                            <span>×</span>
                            <span>{item.load_kg} kg</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity relative">
                      {/* Copy dropdown */}
                      <div className="relative">
                        <button
                          onClick={() => setOpenMenuId(openMenuId === `copy-${item.id}` ? null : `copy-${item.id}`)}
                          className="p-1 hover:bg-neutral-600 rounded text-neutral-400 hover:text-neutral-200"
                          title="Copiar para outra aba"
                        >
                          <Copy size={16} />
                        </button>
                        {openMenuId === `copy-${item.id}` && (
                          <div className="absolute right-0 top-full mt-1 bg-neutral-800 border border-neutral-700 rounded-md shadow-lg z-50 min-w-[120px]">
                            {sessionTabs
                              .filter((s) => s.label !== activeSessionLabel)
                              .map((session) => (
                                <button
                                  key={`copy-${session.label}`}
                                  onClick={() => {
                                    handleCopyExercise(activeSessionLabel, item.id, session.label)
                                    setOpenMenuId(null)
                                  }}
                                  className="w-full text-left px-3 py-2 text-xs hover:bg-neutral-700 text-neutral-300"
                                >
                                  Treino {session.label}
                                </button>
                              ))}
                          </div>
                        )}
                      </div>

                      {/* Move dropdown */}
                      <div className="relative">
                        <button
                          onClick={() => setOpenMenuId(openMenuId === `move-${item.id}` ? null : `move-${item.id}`)}
                          className="p-1 hover:bg-neutral-600 rounded text-neutral-400 hover:text-neutral-200"
                          title="Mover para outra aba"
                        >
                          <Move size={16} />
                        </button>
                        {openMenuId === `move-${item.id}` && (
                          <div className="absolute right-0 top-full mt-1 bg-neutral-800 border border-neutral-700 rounded-md shadow-lg z-50 min-w-[120px]">
                            {sessionTabs
                              .filter((s) => s.label !== activeSessionLabel)
                              .map((session) => (
                                <button
                                  key={`move-${session.label}`}
                                  onClick={() => {
                                    handleMoveExercise(activeSessionLabel, item.id, session.label)
                                    setOpenMenuId(null)
                                  }}
                                  className="w-full text-left px-3 py-2 text-xs hover:bg-neutral-700 text-neutral-300"
                                >
                                  Treino {session.label}
                                </button>
                              ))}
                          </div>
                        )}
                      </div>

                      {/* Delete button */}
                      <button
                        onClick={() => handleRemoveExercise(activeSessionLabel, item.id)}
                        className="p-1 hover:bg-red-500/20 rounded text-neutral-400 hover:text-red-400"
                        title="Remover"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
