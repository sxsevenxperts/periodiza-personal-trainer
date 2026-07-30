/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

'use server'

import { revalidatePath } from 'next/cache'
import { criarClienteServidor } from '@/lib/supabase/server'
import { z } from 'zod'

export async function addPrescriptionItem(sessionId: string, exerciseId: string) {
  const supabase = (await criarClienteServidor()) as any

  // Find max order_index to append to the end
  const { data: existing } = await supabase
    .from('prescription_items')
    .select('order_index')
    .eq('session_id', sessionId)
    .order('order_index', { ascending: false })
    .limit(1)
    .single()

  const nextOrder = existing?.order_index ? existing.order_index + 1 : 1

  const { data, error } = await supabase
    .from('prescription_items')
    .insert({
      session_id: sessionId,
      exercise_id: exerciseId,
      order_index: nextOrder,
      series: 3,
      reps_min: 10,
      reps_max: 12,
      rest_seconds: 60,
    })
    .select()
    .single()

  if (error) {
    console.error('Error adding prescription item:', error)
    return { error: 'Failed to add item.' }
  }

  revalidatePath('/periodizacoes/[periodizationId]', 'page')
  return { data }
}

export async function updatePrescriptionItem(
  itemId: string, 
  updates: {
    series?: number
    reps_min?: number
    reps_max?: number
    load_kg?: number
    rest_seconds?: number
    order_index?: number
  }
) {
  const supabase = (await criarClienteServidor()) as any

  const { error } = await supabase
    .from('prescription_items')
    .update(updates)
    .eq('id', itemId)

  if (error) {
    console.error('Error updating prescription item:', error)
    return { error: 'Failed to update item.' }
  }

  revalidatePath('/periodizacoes/[periodizationId]', 'page')
  return { success: true }
}

export async function removePrescriptionItem(itemId: string) {
  const supabase = (await criarClienteServidor()) as any

  const { error } = await supabase
    .from('prescription_items')
    .delete()
    .eq('id', itemId)

  if (error) {
    console.error('Error removing prescription item:', error)
    return { error: 'Failed to remove item.' }
  }

  revalidatePath('/periodizacoes/[periodizationId]', 'page')
  return { success: true }
}

export async function searchExercises(query: string) {
  const supabase = (await criarClienteServidor()) as any
  
  let q = supabase
    .from('exercises')
    .select('id, name_pt, aliases_pt, primary_muscle_id')
    
  if (query.trim().length > 0) {
    // using unaccent + trgm or just ilike for MVP
    q = q.ilike('name_pt', `%${query}%`)
  }

  const { data, error } = await q.limit(20)

  if (error) {
    console.error('Error searching exercises:', error)
    return { data: [] }
  }

  return { data }
}
