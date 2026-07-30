'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PlusCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createPeriodization } from '@/app/(app)/periodizacoes/actions'

export function NovaPeriodizacaoDialog({ alunos }: { alunos: any[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    const clientId = formData.get('aluno') as string
    const name = formData.get('nome') as string
    const split = formData.get('split') as string
    const weeks = parseInt(formData.get('semanas') as string, 10)
    
    if (!clientId || !name || !split || !weeks) return

    setLoading(true)
    
    try {
      const { data, error } = await createPeriodization({
        clientId,
        name,
        split,
        weeks
      })

      if (error || !data) {
        console.error(error)
        alert('Erro ao criar periodização. Verifique se sua organização está configurada.')
        setLoading(false)
        return
      }

      setOpen(false)
      router.push(`/periodizacoes/${data.id}`)
    } catch (err) {
      console.error(err)
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-amber-500 text-zinc-950 hover:bg-amber-600 gap-2">
          <PlusCircle className="h-4 w-4" /> Nova Periodização
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-zinc-950 border-zinc-800 text-zinc-50">
        <DialogHeader>
          <DialogTitle className="text-amber-500">Nova Periodização</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Crie um novo plano de treino. O builder será aberto logo em seguida.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="aluno">Aluno</Label>
            <Select required name="aluno">
              <SelectTrigger id="aluno" className="bg-zinc-900 border-zinc-800">
                <SelectValue placeholder="Selecione um aluno" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-50">
                {alunos.length === 0 ? (
                  <SelectItem value="none" disabled>Nenhum aluno cadastrado</SelectItem>
                ) : (
                  alunos.map((aluno) => (
                    <SelectItem key={aluno.id} value={aluno.id}>{aluno.name}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="nome">Nome do Bloco/Mesociclo</Label>
            <Input 
              id="nome" 
              placeholder="Ex: Hipertrofia Fase 1" 
              required 
              className="bg-zinc-900 border-zinc-800"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="split">Divisão de Treino</Label>
            <Select required defaultValue="ABC" name="split">
              <SelectTrigger id="split" className="bg-zinc-900 border-zinc-800">
                <SelectValue placeholder="Selecione a divisão" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-50">
                <SelectItem value="A">A (Fullbody)</SelectItem>
                <SelectItem value="AB">AB</SelectItem>
                <SelectItem value="ABC">ABC</SelectItem>
                <SelectItem value="ABCD">ABCD</SelectItem>
                <SelectItem value="ABCDE">ABCDE</SelectItem>
                <SelectItem value="ABCDEF">ABCDEF</SelectItem>
                <SelectItem value="ABCDEFG">ABCDEFG</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="semanas">Duração (Semanas)</Label>
            <Input 
              id="semanas" 
              type="number" 
              min={1} 
              max={24} 
              defaultValue={4}
              required 
              className="bg-zinc-900 border-zinc-800"
            />
          </div>

          <DialogFooter className="pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)}
              className="bg-transparent border-zinc-800 text-zinc-300 hover:text-zinc-50 hover:bg-zinc-800"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="bg-amber-500 text-zinc-950 hover:bg-amber-600"
            >
              {loading ? 'Criando...' : 'Criar Periodização'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
