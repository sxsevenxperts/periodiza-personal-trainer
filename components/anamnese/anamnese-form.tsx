'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Save } from 'lucide-react'
import { saveAnamnese } from '@/app/(app)/alunos/[clientId]/actions'

interface AnamneseFormProps {
  clientId: string
  initialNotes?: string
}

export function AnamneseForm({ clientId, initialNotes }: AnamneseFormProps) {
  const [notes, setNotes] = useState(initialNotes || '')
  const [isPending, startTransition] = useTransition()
  const [isSaved, setIsSaved] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaved(false)
    startTransition(async () => {
      await saveAnamnese(clientId, notes)
      setIsSaved(true)
      setTimeout(() => setIsSaved(false), 3000)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Adicione observações médicas, restrições, histórico de lesões, etc..."
        className="min-h-[200px] bg-zinc-900 border-zinc-800 text-zinc-100"
      />
      <div className="flex justify-end items-center gap-4">
        {isSaved && <span className="text-sm text-green-500">Salvo com sucesso!</span>}
        <Button 
          type="submit" 
          disabled={isPending}
          className="bg-amber-500 text-zinc-950 hover:bg-amber-600"
        >
          {isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Salvar Anamnese
        </Button>
      </div>
    </form>
  )
}
