/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

'use client'

import { useState, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Trash2, GripVertical } from 'lucide-react'
import { updatePrescriptionItem, removePrescriptionItem } from '@/app/(app)/periodizacoes/[periodizationId]/actions'

type PrescriptionItemCardProps = {
  item: any
}

// Simple debounce helper
function debounce<T extends (...args: any[]) => void>(func: T, wait: number) {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export function PrescriptionItemCard({ item }: PrescriptionItemCardProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  
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
    <Card className="p-4 flex gap-4 items-start">
      <div className="mt-2 text-muted-foreground cursor-grab active:cursor-grabbing">
        <GripVertical className="w-5 h-5" />
      </div>
      
      <div className="flex-1 space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <h4 className="font-semibold">{item.exercises?.name_pt}</h4>
            <p className="text-sm text-muted-foreground">
              Ordem: {item.order_index}
            </p>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Séries</Label>
            <Input 
              type="number" 
              defaultValue={item.series || ''} 
              onChange={(e) => onChange('series', e.target.value)}
              className="h-8"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Reps (Min)</Label>
            <Input 
              type="number" 
              defaultValue={item.reps_min || ''} 
              onChange={(e) => onChange('reps_min', e.target.value)}
              className="h-8"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Reps (Max)</Label>
            <Input 
              type="number" 
              defaultValue={item.reps_max || ''} 
              onChange={(e) => onChange('reps_max', e.target.value)}
              className="h-8"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Carga (kg)</Label>
            <Input 
              type="number" 
              defaultValue={item.load_kg || ''} 
              onChange={(e) => onChange('load_kg', e.target.value)}
              className="h-8"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Pausa (seg)</Label>
            <Input 
              type="number" 
              defaultValue={item.rest_seconds || ''} 
              onChange={(e) => onChange('rest_seconds', e.target.value)}
              className="h-8"
            />
          </div>
        </div>
      </div>
    </Card>
  )
}
