'use client'

import { Plus } from 'lucide-react'

interface ExerciseResultProps {
  id: string
  namePt: string
  nameEn: string
  primaryMuscle: string
  movementPattern: string
  equipment: string[]
  technicalLevel: string
  hasRestriction: boolean
  missingEquipment: boolean
  alreadyPrescribedInLabel?: string
  weeklyVolumeSeries: number
  onAddClick: () => void
}

export function ExerciseResult({
  id,
  namePt,
  nameEn,
  primaryMuscle,
  movementPattern,
  equipment,
  technicalLevel,
  hasRestriction,
  missingEquipment,
  alreadyPrescribedInLabel,
  weeklyVolumeSeries,
  onAddClick,
}: ExerciseResultProps) {
  return (
    <div className="flex items-center justify-between p-3 bg-neutral-800 border-b border-neutral-700 hover:bg-neutral-750 transition-colors">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="text-sm font-600 text-neutral-100">{namePt}</h4>
          <span className="text-xs text-neutral-500">{nameEn}</span>
        </div>

        <div className="text-xs text-neutral-400 mb-2">
          {primaryMuscle} · {movementPattern}
        </div>

        <div className="text-xs text-neutral-500 mb-2">
          {equipment.join(', ')} · {technicalLevel}
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          {hasRestriction && (<span className="text-xs px-2 py-1 bg-destructive/20 text-destructive rounded">🔴 Restrito</span>)}
          {missingEquipment && (<span className="text-xs px-2 py-1 bg-warning/20 text-warning rounded">🟡 Sem equip.</span>)}
          {alreadyPrescribedInLabel && (<span className="text-xs px-2 py-1 bg-info/20 text-info rounded">🔵 já no {alreadyPrescribedInLabel}</span>)}
          {weeklyVolumeSeries > 0 && (<span className="text-xs px-2 py-1 bg-neutral-700 text-neutral-300 rounded">⚪ {weeklyVolumeSeries} séries/sem</span>)}
        </div>
      </div>

      <button onClick={onAddClick} className="ml-4 p-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded transition-colors">
        <Plus size={18} />
      </button>
    </div>
  )
}
