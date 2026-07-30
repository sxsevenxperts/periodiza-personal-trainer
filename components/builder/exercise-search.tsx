/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { searchExercises, addPrescriptionItem } from '@/app/(app)/periodizacoes/[periodizationId]/actions'
import { Search, Plus, Loader2 } from 'lucide-react'

export function ExerciseSearch({ sessionId }: { sessionId: string }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [isPending, startTransition] = useTransition()
  const [isAdding, setIsAdding] = useState<string | null>(null)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const { data } = await searchExercises(query)
      setResults(data || [])
    })
  }

  const handleAdd = async (exerciseId: string) => {
    setIsAdding(exerciseId)
    await addPrescriptionItem(sessionId, exerciseId)
    setIsAdding(null)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Search className="w-4 h-4" />
          Adicionar Exercício
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Catálogo de Exercícios</DialogTitle>
          <DialogDescription>
            Busque pelo nome ou músculo primário.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSearch} className="flex gap-2 mb-4">
          <Input 
            placeholder="Ex: Supino reto..." 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Button type="submit" disabled={isPending}>
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Buscar'}
          </Button>
        </form>

        <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto">
          {results.length === 0 && !isPending && (
            <p className="text-center text-sm text-muted-foreground py-8">
              Nenhum exercício encontrado.
            </p>
          )}
          {results.map((exercise) => (
            <div 
              key={exercise.id} 
              className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50 transition-colors"
            >
              <div>
                <p className="font-medium text-sm">{exercise.name_pt}</p>
                {exercise.aliases_pt?.length > 0 && (
                  <p className="text-xs text-muted-foreground">{exercise.aliases_pt[0]}</p>
                )}
              </div>
              <Button 
                size="sm" 
                variant="secondary" 
                onClick={() => handleAdd(exercise.id)}
                disabled={isAdding === exercise.id}
              >
                {isAdding === exercise.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
