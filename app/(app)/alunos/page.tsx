import type { Metadata } from 'next'
import Link from 'next/link'
import { CabecalhoPagina } from '@/components/layout/cabecalho-pagina'
import { Button } from '@/components/ui/button'
import { PlusCircle, Users, Activity } from 'lucide-react'
import { getAlunos } from './actions'
import { NovoAlunoDialog } from '@/components/alunos/novo-aluno-dialog'

export const metadata: Metadata = {
  title: 'Alunos | Periodiza',
}

export default async function AlunosPage() {
  const alunos = await getAlunos()

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950">
      <CabecalhoPagina 
        titulo="Alunos" 
        descricao="Gerencie seus alunos, anamneses e evoluções." 
      />

      <div className="flex-1 p-6 md:p-8 space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-zinc-100">Seus Alunos</h2>
          <NovoAlunoDialog />
        </div>

        {alunos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-zinc-800 rounded-xl bg-zinc-900/20 text-center px-4">
            <Users className="w-12 h-12 text-zinc-600 mb-4" />
            <h3 className="text-lg font-medium text-zinc-300">Nenhum aluno cadastrado</h3>
            <p className="text-zinc-500 mt-1 max-w-sm">
              Adicione seu primeiro aluno para realizar a anamnese e começar a periodização.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {alunos.map((aluno) => (
              <div key={aluno.id} className="group flex flex-col p-5 border border-zinc-800 rounded-xl bg-zinc-900/30 hover:bg-zinc-900/80 transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold text-lg text-zinc-50">{aluno.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`w-2 h-2 rounded-full ${aluno.status === 'ativo' ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span className="text-xs text-zinc-400 capitalize">{aluno.status}</span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-auto pt-4 border-t border-zinc-800/50 flex items-center justify-between">
                  <div className="text-sm text-zinc-500 flex items-center gap-1">
                    <Activity className="w-4 h-4" />
                    <span>0 Planos</span>
                  </div>
                  <Button asChild variant="ghost" size="sm" className="text-amber-500 hover:text-amber-400 hover:bg-amber-500/10">
                    <Link href={`/alunos/${aluno.id}`}>Ver Perfil</Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
