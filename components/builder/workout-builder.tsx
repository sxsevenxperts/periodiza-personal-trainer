/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ExerciseSearch } from './exercise-search'
import { PrescriptionItemCard } from './prescription-item-card'
import { Button } from '@/components/ui/button'

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
  // Use first session label as default if available, else 'A'
  const defaultTab = sessions.length > 0 ? sessions[0]?.label || 'A' : 'A'
  const [activeTab, setActiveTab] = useState(defaultTab)

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight">Divisão atual: {split}</h2>
        <Button variant="outline" size="sm">Alterar Divisão</Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          {sessions.map((session) => (
            <TabsTrigger key={session.id} value={session.label}>
              Treino {session.label}
            </TabsTrigger>
          ))}
        </TabsList>
        
        {sessions.map((session) => {
          const sessionItems = prescriptionItems
            .filter((item) => item.session_id === session.id)
            .sort((a, b) => a.order_index - b.order_index)

          return (
            <TabsContent key={session.id} value={session.label} className="space-y-6">
              <div className="flex justify-between items-center bg-muted/50 p-4 rounded-lg border">
                <div>
                  <h3 className="font-medium">Treino {session.label}</h3>
                  <p className="text-sm text-muted-foreground">
                    {session.name || 'Sem nome definido'}
                  </p>
                </div>
                <ExerciseSearch sessionId={session.id} />
              </div>

              {sessionItems.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                  Nenhum exercício neste treino. Busque no catálogo acima.
                </div>
              ) : (
                <div className="grid gap-4">
                  {sessionItems.map((item) => (
                    <PrescriptionItemCard key={item.id} item={item} />
                  ))}
                </div>
              )}
            </TabsContent>
          )
        })}
      </Tabs>
    </div>
  )
}
