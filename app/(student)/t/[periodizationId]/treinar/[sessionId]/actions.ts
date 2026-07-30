'use server'

import { criarClienteServidor } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getSessionExecutionData(sessionId: string) {
  const supabase = await criarClienteServidor()
  
  // We need the session and its prescription items.
  const { data, error } = await supabase
    .from('sessions')
    .select(`
      id, label, name, status,
      prescription_items(
        id, order_index, series, reps_min, reps_max, load_kg, rest_seconds, rir_target, rpe_target,
        exercises(id, name_pt, video_url)
      )
    `)
    .eq('id', sessionId)
    .single()

  if (error) {
    console.error('Erro ao buscar treino:', error)
    return null
  }

  // Sort items by order_index
  if (data?.prescription_items) {
    data.prescription_items.sort(
      (a: { order_index: number }, b: { order_index: number }) =>
        a.order_index - b.order_index,
    )
  }

  return data
}

export async function finishSession(sessionId: string, periodizationId: string) {
  const supabase = await criarClienteServidor()
  
  // For MVP, just update session status to concluida
  const { error } = await supabase
    .from('sessions')
    .update({ status: 'concluida' })
    .eq('id', sessionId)

  if (error) {
    console.error('Erro ao finalizar treino:', error)
    return { error: 'Falha ao finalizar treino' }
  }

  revalidatePath(`/t/${periodizationId}`)
  revalidatePath(`/t/${periodizationId}/treinar/${sessionId}`)
  
  return { success: true }
}
