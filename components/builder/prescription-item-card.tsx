/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

'use client'

import { useState, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Trash2, GripVertical, CornerUpRight, Copy, Loader2 } from 'lucide-react'
import {
  updatePrescriptionItem,
  removePrescriptionItem,
  movePrescriptionItem,
  copyPrescriptionItem,
} from '@/app/(app)/periodizacoes/[periodizationId]/actions'
import { Draggable } from '@hello-pangea/dnd'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

type SessionOption = {
  id: string
  label: string
}

type PrescriptionItemCardProps = {
  item: any
  index: number
  /** Demais sessões (abas) da semana, para "Mover para…" e "Copiar para…". */
  sessions?: SessionOption[]
}

// Simple debounce helper
function debounce<T extends (...args: any[]) => void>(func: T, wait: number) {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

/**
 * Popover de destino para "Mover para…" / "Copiar para…" (abas A-G).
 */
function TransferPopover({
  modo,
  destinos,
  pendente,
  onSelecionar,
}: {
  modo: 'mover' | 'copiar'
  destinos: SessionOption[]
  pendente: boolean
  onSelecionar: (sessionId: string) => void
}) {
  const [aberto, setAberto] = useState(false)
  const titulo = modo === 'mover' ? 'Mover para…' : 'Copiar para…'
  const Icone = modo === 'mover' ? CornerUpRight : Copy

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-zinc-400 hover:text-amber-500 hover:bg-amber-500/10"
          disabled={pendente}
          title={titulo}
          aria-label={titulo}
        >
          {pendente ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Icone className="w-4 h-4" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-44 p-1 bg-zinc-950 border-zinc-800">
        <p className="px-2 py-1.5 text-[10px] font-bold uppercase text-zinc-500">
          {titulo}
        </p>
        {destinos.map((destino) => (
          <button
            key={destino.id}
            type="button"
            onClick={() => {
              setAberto(false)
              onSelecionar(destino.id)
            }}
            className="w-full rounded px-2 py-1.5 text-left text-sm text-zinc-200 hover:bg-amber-500/10 hover:text-amber-500 transition-colors"
          >
            Treino {destino.label}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  )
}

export function PrescriptionItemCard({ item, index, sessions = [] }: PrescriptionItemCardProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [transferPendente, setTransferPendente] = useState<'mover' | 'copiar' | null>(null)
  const [erroTransfer, setErroTransfer] = useState<string | null>(null)

  // Destinos possíveis: todas as abas menos a que o item já ocupa.
  const destinos = sessions.filter((s) => s.id !== item.session_id)

  const handleTransfer = async (
    modo: 'mover' | 'copiar',
    targetSessionId: string,
  ) => {
    setErroTransfer(null)
    setTransferPendente(modo)
    try {
      const resultado =
        modo === 'mover'
          ? await movePrescriptionItem(item.id, targetSessionId)
          : await copyPrescriptionItem(item.id, targetSessionId)

      if (resultado && 'error' in resultado && resultado.error) {
        setErroTransfer(
          modo === 'mover' ? 'Falha ao mover exercício.' : 'Falha ao copiar exercício.',
        )
      }
    } catch {
      setErroTransfer('Erro inesperado. Tente novamente.')
    } finally {
      setTransferPendente(null)
    }
  }
  
  // Debounced update to avoid spamming the database on every keystroke
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleUpdate = useCallback(
    debounce((field: string, value: number) => {
      updatePrescriptionItem(item.id, { [field]: value })
    }, 500),
    [item.id]
  )

  const onChange = (field: string, value: string) => {
    const num = parseInt(value, 10)
    if (!isNaN(num)) {
      handleUpdate(field, num)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    await removePrescriptionItem(item.id)
  }

  return (
    <Draggable draggableId={item.id} index={index}>
      {(provided, snapshot) => (
        <Card 
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`p-4 flex gap-4 items-start bg-zinc-950 border-zinc-800 transition-shadow ${
            snapshot.isDragging ? 'shadow-lg shadow-amber-500/20 border-amber-500/50' : 'hover:border-zinc-700'
          }`}
        >
          <div 
            {...provided.dragHandleProps}
            className="mt-2 text-zinc-500 cursor-grab active:cursor-grabbing hover:text-amber-500 transition-colors"
          >
            <GripVertical className="w-5 h-5" />
          </div>
          
          <div className="flex-1 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-semibold text-zinc-50 leading-none">{item.exercises?.name_pt}</h4>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs bg-zinc-900 text-zinc-400 px-2 py-0.5 rounded-full border border-zinc-800">
                    Ordem: {item.order_index + 1}
                  </span>
                  {item.exercises?.primary_muscle_id && (
                    <span className="text-xs bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full border border-amber-500/20">
                      Músculo: {item.exercises.primary_muscle_id.split('-').pop()}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {destinos.length > 0 && (
                  <>
                    <TransferPopover
                      modo="copiar"
                      destinos={destinos}
                      pendente={transferPendente === 'copiar'}
                      onSelecionar={(sessionId) => handleTransfer('copiar', sessionId)}
                    />
                    <TransferPopover
                      modo="mover"
                      destinos={destinos}
                      pendente={transferPendente === 'mover'}
                      onSelecionar={(sessionId) => handleTransfer('mover', sessionId)}
                    />
                  </>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-400 hover:text-red-300 hover:bg-red-400/10 h-8 w-8"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {erroTransfer && (
              <p role="alert" className="text-xs text-red-400">
                {erroTransfer}
              </p>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase text-zinc-500 font-bold">Séries</Label>
                <Input 
                  type="number" 
                  defaultValue={item.series || ''} 
                  onChange={(e) => onChange('series', e.target.value)}
                  className="h-8 bg-zinc-900 border-zinc-800 text-zinc-100"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase text-zinc-500 font-bold">Reps (Min)</Label>
                <Input 
                  type="number" 
                  defaultValue={item.reps_min || ''} 
                  onChange={(e) => onChange('reps_min', e.target.value)}
                  className="h-8 bg-zinc-900 border-zinc-800 text-zinc-100"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase text-zinc-500 font-bold">Reps (Max)</Label>
                <Input 
                  type="number" 
                  defaultValue={item.reps_max || ''} 
                  onChange={(e) => onChange('reps_max', e.target.value)}
                  className="h-8 bg-zinc-900 border-zinc-800 text-zinc-100"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase text-zinc-500 font-bold">Carga (kg)</Label>
                <Input 
                  type="number" 
                  defaultValue={item.load_kg || ''} 
                  onChange={(e) => onChange('load_kg', e.target.value)}
                  className="h-8 bg-zinc-900 border-zinc-800 text-zinc-100"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase text-zinc-500 font-bold">RIR</Label>
                <Input 
                  type="number" 
                  defaultValue={item.rir_target || ''} 
                  onChange={(e) => onChange('rir_target', e.target.value)}
                  className="h-8 bg-zinc-900 border-zinc-800 text-zinc-100"
                  placeholder="ex: 2"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase text-zinc-500 font-bold">RPE</Label>
                <Input 
                  type="number" 
                  defaultValue={item.rpe_target || ''} 
                  onChange={(e) => onChange('rpe_target', e.target.value)}
                  className="h-8 bg-zinc-900 border-zinc-800 text-zinc-100"
                  placeholder="ex: 8"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase text-zinc-500 font-bold">Pausa (seg)</Label>
                <Input 
                  type="number" 
                  defaultValue={item.rest_seconds || ''} 
                  onChange={(e) => onChange('rest_seconds', e.target.value)}
                  className="h-8 bg-zinc-900 border-zinc-800 text-zinc-100"
                />
              </div>
            </div>
          </div>
        </Card>
      )}
    </Draggable>
  )
}
