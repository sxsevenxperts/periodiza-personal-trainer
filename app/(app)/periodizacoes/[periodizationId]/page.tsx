/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { CabecalhoPagina } from '@/components/layout/cabecalho-pagina'
import { criarClienteServidor } from '@/lib/supabase/server'
import { WorkoutBuilder } from '@/components/builder/workout-builder'

export const metadata: Metadata = {
  title: 'Builder de treinos',
}

interface PaginaPeriodizacaoProps {
  params: Promise<{ periodizationId: string }>
}

export default async function PaginaPeriodizacao({
  params,
}: PaginaPeriodizacaoProps) {
  const { periodizationId } = await params
  const supabase = (await criarClienteServidor()) as any

  // 1. Load the periodization and its split
  const { data: periodization } = await supabase
    .from('periodizations')
    .select('id, name, split, status')
    .eq('id', periodizationId)
    .single()

  if (!periodization) {
    redirect('/dashboard') // Handle 404 or redirect appropriately
  }

  // 2. Carrega o primeiro microciclo da periodizacao (MVP: uma semana por vez).
  const { data: currentMicrocycle } = await supabase
    .from('microcycles')
    .select(`
      id, 
      mesocycles!inner(periodization_id)
    `)
    .eq('mesocycles.periodization_id', periodizationId)
    .order('week_number', { ascending: true })
    .limit(1)
    .single()
    
  if (!currentMicrocycle) {
    return <div>Nenhum microciclo encontrado.</div>
  }

  // 3. Load all sessions for this microcycle
  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, label, name')
    .eq('microcycle_id', currentMicrocycle.id)
    .order('label', { ascending: true })

  // 4. Load all prescription items for these sessions
  const sessionIds = sessions?.map((s: any) => s.id) || []
  const { data: prescriptionItems } = await supabase
    .from('prescription_items')
    .select(`
      id,
      session_id,
      order_index,
      series,
      reps_min,
      reps_max,
      load_kg,
      rest_seconds,
      exercises (
        id,
        name_pt,
        primary_muscle_id
      )
    `)
    .in('session_id', sessionIds)
    .order('order_index', { ascending: true })

  return (
    <>
      <CabecalhoPagina
        titulo="Builder de Treinos"
        descricao={`Montagem estruturada para a periodização: ${periodization.name}`}
      />
      
      <div className="mt-6">
        <WorkoutBuilder 
          periodizationId={periodization.id}
          split={periodization.split || 'ABC'}
          sessions={sessions || []}
          prescriptionItems={prescriptionItems || []}
        />
      </div>
    </>
  )
}

