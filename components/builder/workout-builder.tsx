/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

'use client'

import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CatalogSidebar } from './catalog-sidebar'
import { PrescriptionItemCard } from './prescription-item-card'
import { Button } from '@/components/ui/button'
import { DragDropContext, Droppable, DropResult } from '@hello-pangea/dnd'
import { updatePrescriptionOrder } from '@/app/(app)/periodizacoes/[periodizationId]/actions'

type Session = {
  id: string
  label: string
  name: string | null
}

type PrescriptionItem = {
  id: string
  session_id: string
  order_index: number
  series: number | null
  reps_min: number | null
  reps_max: number | null
  load_kg: number | null
  rest_seconds: number | null
  exercises: {
    id: string
    name_pt: string
    primary_muscle_id: string | null
  } | null
}

type WorkoutBuilderProps = {
  periodizationId: string
  split: string
  sessions: Session[]
  prescriptionItems: PrescriptionItem[]
}

export function WorkoutBuilder({
  periodizationId,
  split,
  sessions,
  prescriptionItems,
}: WorkoutBuilderProps) {
  const defaultTab = sessions.length > 0 ? sessions[0]?.label || 'A' : 'A'
  const [activeTabLabel, setActiveTabLabel] = useState(defaultTab)
  const [localItems, setLocalItems] = useState(prescriptionItems)

  useEffect(() => {
    setLocalItems(prescriptionItems)
  }, [prescriptionItems])

  // Encontra o ID da sessão ativa baseado na aba atual
  const activeSession = sessions.find(s => s.label === activeTabLabel)
  const activeSessionId = activeSession?.id || ''

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return

    const sourceIndex = result.source.index
    const destinationIndex = result.destination.index
    const droppableId = result.source.droppableId

    if (sourceIndex === destinationIndex) return

    const newItems = Array.from(localItems)
    
    const sessionItems = newItems
      .filter((item) => item.session_id === droppableId)
      .sort((a, b) => a.order_index - b.order_index)

    const [movedItem] = sessionItems.splice(sourceIndex, 1)
    if (!movedItem) return
    sessionItems.splice(destinationIndex, 0, movedItem)

    sessionItems.forEach((item, index) => {
      item.order_index = index
      const globalIndex = newItems.findIndex((i) => i.id === item.id)
      if (globalIndex !== -1) {
        newItems[globalIndex] = item
      }
    })

    setLocalItems(newItems)

    await updatePrescriptionOrder(
      sessionItems.map((i) => ({
        id: i.id,
        order_index: i.order_index,
        session_id: i.session_id,
      }))
    )
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="w-full lg:w-80 shrink-0">
        <CatalogSidebar activeSessionId={activeSessionId} />
      </div>

      <div className="flex-1 flex flex-col space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-tight">Divisão atual: {split}</h2>
          <Button variant="outline" size="sm">Alterar Divisão</Button>
        </div>

        <DragDropContext onDragEnd={onDragEnd}>
          <Tabs value={activeTabLabel} onValueChange={setActiveTabLabel} className="w-full">
            <TabsList className="mb-4">
              {sessions.map((session) => (
                <TabsTrigger key={session.id} value={session.label}>
                  Treino {session.label}
                </TabsTrigger>
              ))}
            </TabsList>
            
            {sessions.map((session) => {
              const sessionItems = localItems
                .filter((item) => item.session_id === session.id)
                .sort((a, b) => a.order_index - b.order_index)

              return (
                <TabsContent key={session.id} value={session.label} className="space-y-6">
                  <div className="flex justify-between items-center bg-zinc-950 p-4 rounded-lg border border-zinc-800">
                    <div>
                      <h3 className="font-medium text-amber-500">Treino {session.label}</h3>
                      <p className="text-sm text-zinc-400">
                        {session.name || 'Personalize o nome deste bloco...'}
                      </p>
                    </div>
                  </div>

                  <Droppable droppableId={session.id}>
                    {(provided) => (
                      <div 
                        {...provided.droppableProps} 
                        ref={provided.innerRef}
                        className="min-h-[300px] pb-24"
                      >
                        {sessionItems.length === 0 ? (
                          <div className="text-center py-12 text-zinc-500 border-2 border-dashed border-zinc-800 rounded-lg">
                            Nenhum exercício neste treino. Busque no catálogo ao lado e adicione.
                          </div>
                        ) : (
                          <div className="flex flex-col gap-3">
                            {sessionItems.map((item, index) => (
                              <PrescriptionItemCard key={item.id} item={item} index={index} />
                            ))}
                          </div>
                        )}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </TabsContent>
              )
            })}
          </Tabs>
        </DragDropContext>
      </div>
    </div>
  )
}
