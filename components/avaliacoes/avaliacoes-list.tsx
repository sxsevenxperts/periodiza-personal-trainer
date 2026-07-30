'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { createAssessment } from '@/app/(app)/alunos/[clientId]/actions'
import { Loader2, Plus, Calendar } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import type { AvaliacaoResumo } from '@/lib/types/dominio'

interface AvaliacoesListProps {
  clientId: string
  assessments: AvaliacaoResumo[]
}

export function AvaliacoesList({ clientId, assessments }: AvaliacoesListProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    
    const formData = new FormData(e.currentTarget)
    const date = formData.get('date') as string
    const notes = formData.get('notes') as string
    
    if (!date) return

    const { error } = await createAssessment(clientId, date, notes)

    if (error) {
      console.error(error)
      alert('Erro ao criar avaliação.')
      setLoading(false)
      return
    }

    setOpen(false)
    setLoading(false)
    
    startTransition(() => {
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="font-medium text-zinc-300">Histórico de Avaliações</h3>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-amber-500 text-zinc-950 hover:bg-amber-600 gap-2">
              <Plus className="w-4 h-4" /> Nova Avaliação
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-50">
            <DialogHeader>
              <DialogTitle>Nova Avaliação Física</DialogTitle>
            </DialogHeader>
            <form onSubmit={onSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="date">Data da Avaliação</Label>
                <Input 
                  id="date" 
                  name="date" 
                  type="date" 
                  required
                  defaultValue={new Date().toISOString().split('T')[0]}
                  className="bg-zinc-900 border-zinc-800" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Anotações / Medidas</Label>
                <Textarea 
                  id="notes" 
                  name="notes"
                  placeholder="Peso, dobras cutâneas, perímetros, % de gordura, etc."
                  className="min-h-[120px] bg-zinc-900 border-zinc-800"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full bg-amber-500 text-zinc-950 hover:bg-amber-600"
                disabled={loading}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Salvar Avaliação
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {assessments.length === 0 ? (
        <div className="text-center py-8 text-zinc-500 border border-zinc-800 rounded-lg bg-zinc-900/30">
          Nenhuma avaliação registrada.
        </div>
      ) : (
        <div className="space-y-4">
          {isPending && <div className="text-center text-xs text-amber-500">Atualizando...</div>}
          {assessments.map(assessment => (
            <div key={assessment.id} className="p-4 border border-zinc-800 rounded-lg bg-zinc-900/50">
              <div className="flex items-center gap-2 text-amber-500 font-medium mb-2">
                <Calendar className="w-4 h-4" />
                {new Date(assessment.assessment_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
              </div>
              {assessment.notes ? (
                <p className="text-zinc-300 text-sm whitespace-pre-wrap">{assessment.notes}</p>
              ) : (
                <p className="text-zinc-500 text-sm italic">Sem anotações.</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
