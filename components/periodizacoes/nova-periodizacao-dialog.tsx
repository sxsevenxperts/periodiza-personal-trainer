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

export function NovaPeriodizacaoDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    
    // MOCK: Simula a criação e redirecionamento para o builder
    // TODO: chamar server action real para inserir na tabela periodizations
    setTimeout(() => {
      setLoading(false)
      setOpen(false)
      // ID hardcoded do mock para abrir o builder
      router.push('/periodizacoes/123')
    }, 1000)
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
            <Select required>
              <SelectTrigger id="aluno" className="bg-zinc-900 border-zinc-800">
                <SelectValue placeholder="Selecione um aluno" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-50">
                <SelectItem value="joao">João Silva</SelectItem>
                <SelectItem value="carlos">Carlos Pereira</SelectItem>
                <SelectItem value="maria">Maria Oliveira</SelectItem>
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
            <Select required defaultValue="ABC">
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
