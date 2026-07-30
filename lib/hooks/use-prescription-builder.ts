'use client'

import { useState, useCallback } from 'react'

export interface UsePrescriptionBuilderProps {
  sessionId: string
  clientId: string
  clientObjective: string
  clientLevel: string
  mesocyclePhase: string
  volumeStrategy: string
}

export function usePrescriptionBuilder({
  sessionId,
  clientId,
  clientObjective,
  clientLevel,
  mesocyclePhase,
  volumeStrategy,
}: UsePrescriptionBuilderProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [lastAddedLabel, setLastAddedLabel] = useState<string | null>(null)

  const addExercise = useCallback(
    async (exerciseId: string, destinationLabel: string, exerciseVariantId?: string) => {
      setIsLoading(true)
      try {
        // Aqui chamaria addPrescriptionItem com dados pré-preenchidos
        // Por enquanto, apenas simulamos o estado
        setLastAddedLabel(destinationLabel)
        setTimeout(() => setLastAddedLabel(null), 5000)
      } catch (error) {
        console.error('Erro ao adicionar exercício:', error)
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [sessionId, clientObjective, clientLevel, mesocyclePhase, volumeStrategy],
  )

  return {
    addExercise,
    isLoading,
    lastAddedLabel,
  }
}
