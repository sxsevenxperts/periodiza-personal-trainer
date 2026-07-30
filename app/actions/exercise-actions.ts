'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export interface SearchExercisesParams {
  query?: string
  categoryFilter?: string
  movementFilter?: string
  muscleFilter?: string
  equipmentFilter?: string
  clientId?: string
}

export async function searchExercises(params: SearchExercisesParams) {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookies) {
          cookies.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        },
      },
    },
  )

  const { data, error } = await supabase.rpc('search_exercises', {
    query_text: params.query || '',
    category_filter: params.categoryFilter,
    movement_filter: params.movementFilter,
    muscle_filter: params.muscleFilter,
    equipment_filter: params.equipmentFilter,
    client_id: params.clientId,
  })

  if (error) throw error
  return data
}

export async function addPrescriptionItem(
  sessionId: string,
  exerciseId: string,
  exerciseVariantId?: string,
  prescriptionData?: {
    series?: number
    reps_min?: number
    reps_max?: number
    load_kg?: number
    rir_target?: number
    rpe_target?: number
    rest_seconds?: number
  },
) {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookies) {
          cookies.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        },
      },
    },
  )

  const { data, error } = await supabase
    .from('prescription_items')
    .insert({
      session_id: sessionId,
      exercise_id: exerciseId,
      exercise_variant_id: exerciseVariantId,
      series: prescriptionData?.series || 3,
      reps_min: prescriptionData?.reps_min || 8,
      reps_max: prescriptionData?.reps_max || 12,
      load_kg: prescriptionData?.load_kg,
      rir_target: prescriptionData?.rir_target || 2,
      rpe_target: prescriptionData?.rpe_target || 7,
      rest_seconds: prescriptionData?.rest_seconds || 90,
      is_working_set: true,
    })
    .select()

  if (error) throw error
  return data
}

export async function getSessionPrescriptions(sessionId: string) {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookies) {
          cookies.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        },
      },
    },
  )

  const { data, error } = await supabase
    .from('prescription_items')
    .select('*, exercises(id, name_pt, name_en, primary_muscle_id)')
    .eq('session_id', sessionId)
    .order('order_index', { ascending: true })

  if (error) throw error
  return data
}

export async function deletePrescriptionItem(itemId: string) {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookies) {
          cookies.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        },
      },
    },
  )

  const { error } = await supabase
    .from('prescription_items')
    .delete()
    .eq('id', itemId)

  if (error) throw error
  return true
}

export async function updatePrescriptionItemOrder(
  itemId: string,
  orderIndex: number,
) {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookies) {
          cookies.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        },
      },
    },
  )

  const { data, error } = await supabase
    .from('prescription_items')
    .update({ order_index: orderIndex })
    .eq('id', itemId)
    .select()

  if (error) throw error
  return data
}

export async function movePrescriptionItem(
  itemId: string,
  targetSessionId: string,
) {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookies) {
          cookies.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        },
      },
    },
  )

  const { data, error } = await supabase
    .from('prescription_items')
    .update({ session_id: targetSessionId })
    .eq('id', itemId)
    .select()

  if (error) throw error
  return data
}

export async function copyPrescriptionItem(
  itemId: string,
  targetSessionId: string,
) {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookies) {
          cookies.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        },
      },
    },
  )

  // Get the item to copy
  const { data: itemToCopy, error: fetchError } = await supabase
    .from('prescription_items')
    .select()
    .eq('id', itemId)
    .single()

  if (fetchError) throw fetchError
  if (!itemToCopy) throw new Error('Item not found')

  // Create new item in target session
  const { data, error } = await supabase
    .from('prescription_items')
    .insert({
      session_id: targetSessionId,
      exercise_id: itemToCopy.exercise_id,
      exercise_variant_id: itemToCopy.exercise_variant_id,
      series: itemToCopy.series,
      reps_min: itemToCopy.reps_min,
      reps_max: itemToCopy.reps_max,
      load_kg: itemToCopy.load_kg,
      rir_target: itemToCopy.rir_target,
      rpe_target: itemToCopy.rpe_target,
      rest_seconds: itemToCopy.rest_seconds,
      is_working_set: itemToCopy.is_working_set,
    })
    .select()

  if (error) throw error
  return data
}
