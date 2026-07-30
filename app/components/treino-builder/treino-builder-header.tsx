'use client'

import { Plus } from 'lucide-react'

export interface SessionTab {
  label: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G'
  name: string
  exerciseCount: number
  isActive: boolean
}

interface TreinoBuildHeaderProps {
  sessions: SessionTab[]
  onTabChange: (label: string) => void
  onAddSession: () => void
  split: string
  canAddMore: boolean
}

export function TreinoBuildHeader({
  sessions,
  onTabChange,
  onAddSession,
  split,
  canAddMore,
}: TreinoBuildHeaderProps) {
  return (
    <div className="border-b border-neutral-800 bg-neutral-900 px-4 py-3">
      <div className="flex items-center gap-1 mb-2">
        {sessions.map((session) => (
          <button
            key={session.label}
            onClick={() => onTabChange(session.label)}
            className={`px-3 py-2 text-sm font-500 rounded-t-md transition-colors whitespace-nowrap ${
              session.isActive
                ? 'bg-gradient-gold-h text-neutral-black'
                : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
            }`}
          >
            Treino {session.label}
            <span className="ml-1 text-xs opacity-75">({session.exerciseCount})</span>
          </button>
        ))}

        <button
          onClick={onAddSession}
          disabled={!canAddMore}
          className={`px-3 py-2 ml-2 rounded-t-md transition-colors flex items-center gap-1 text-sm ${
            canAddMore
              ? 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
              : 'bg-neutral-900 text-neutral-600 cursor-not-allowed'
          }`}
          title={!canAddMore ? 'Limite A–G atingido. Promova o split.' : 'Adicionar novo treino'}
        >
          <Plus size={16} />+ Adicionar treino
        </button>
      </div>

      <div className="text-xs text-neutral-500">
        Divisão: {split} | {sessions.length} treino{sessions.length !== 1 ? 's' : ''} configurado{sessions.length !== 1 ? 's' : ''}
      </div>
    </div>
  )
}
