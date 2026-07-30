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
