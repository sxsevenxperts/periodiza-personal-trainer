import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CabecalhoPagina } from '@/components/layout/cabecalho-pagina'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getAluno, getAnamnese, getAssessments } from './actions'
import { ClipboardList, Activity, Dumbbell, CalendarRange } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

import { AvaliacoesList } from '@/components/avaliacoes/avaliacoes-list'
import { AnamneseForm } from '@/components/anamnese/anamnese-form'

export const metadata: Metadata = {
  title: 'Perfil do Aluno | Periodiza',
}

interface PageProps {
  params: Promise<{ clientId: string }>
}

export default async function AlunoProfilePage({ params }: PageProps) {
  const { clientId } = await params
  
  const [aluno, anamnese, avaliacoes] = await Promise.all([
    getAluno(clientId),
    getAnamnese(clientId),
    getAssessments(clientId)
  ])

  if (!aluno) {
    notFound()
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950">
      <CabecalhoPagina 
        titulo={aluno.name} 
        descricao="Gerencie o perfil completo, anamnese e planos do aluno." 
      />

      <div className="flex-1 p-6 md:p-8">
        <Tabs defaultValue="anamnese" className="w-full">
          <TabsList className="bg-zinc-900 border-zinc-800 mb-6">
            <TabsTrigger value="anamnese" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-amber-500 gap-2">
              <ClipboardList className="w-4 h-4" /> Anamnese
            </TabsTrigger>
            <TabsTrigger value="avaliacoes" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-amber-500 gap-2">
              <Activity className="w-4 h-4" /> Avaliações
            </TabsTrigger>
            <TabsTrigger value="equipamentos" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-amber-500 gap-2">
              <Dumbbell className="w-4 h-4" /> Equipamentos
            </TabsTrigger>
            <TabsTrigger value="periodizacoes" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-amber-500 gap-2">
              <CalendarRange className="w-4 h-4" /> Periodizações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="anamnese" className="space-y-4">
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-zinc-50">Anamnese do Aluno</CardTitle>
                <CardDescription className="text-zinc-400">
                  Histórico médico, objetivos e restrições.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AnamneseForm clientId={clientId} initialNotes={anamnese?.notes} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="avaliacoes" className="space-y-4">
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-zinc-50">Avaliações Físicas</CardTitle>
                <CardDescription className="text-zinc-400">
                  Acompanhe a evolução corporal e performance.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AvaliacoesList clientId={clientId} assessments={avaliacoes} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="equipamentos" className="space-y-4">
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-zinc-50">Equipamentos Disponíveis</CardTitle>
                <CardDescription className="text-zinc-400">
                  Configure o que o aluno tem acesso para treinar.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-zinc-500">
                  <Dumbbell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Filtro de equipamentos em desenvolvimento.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="periodizacoes" className="space-y-4">
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-zinc-50">Planos de Treino</CardTitle>
                <CardDescription className="text-zinc-400">
                  Periodizações ativas e histórico do aluno.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-zinc-500">
                  <CalendarRange className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma periodização vinculada ainda.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
