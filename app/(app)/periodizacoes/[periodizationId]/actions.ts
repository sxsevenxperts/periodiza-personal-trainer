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
    rir_target?: number
    rpe_target?: number
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

export async function getMuscles() {
  const supabase = (await criarClienteServidor()) as any
  const { data, error } = await supabase
    .from('muscles')
    .select('id, name_pt')
    .order('name_pt')

  if (error) {
    console.error('Error fetching muscles:', error)
    return { data: [] }
  }

  return { data }
}

export interface ContextoBusca {
  /** Aluno da periodizacao. Habilita as anotacoes de restricao e equipamento. */
  clientId?: string | null
  /** Microciclo (semana) atual. Habilita a anotacao "ja prescrito". */
  microcycleId?: string | null
}

/**
 * Busca de exercicios via RPC `search_exercises` (migration 0010).
 *
 * Ganhos sobre a busca anterior por `ilike`:
 *   - sem acento: "gluteo" encontra "Glúteo"
 *   - erro de digitacao: "agacahmento" encontra "Agachamento" (trigram)
 *   - alias: "hip thrust" encontra "Elevação pélvica"
 *   - anotacoes contextuais do aluno (restrito / sem equipamento / ja prescrito)
 *
 * FALLBACK TEMPORARIO: enquanto a migration 0010 nao for aplicada, a funcao
 * nao existe no banco e o Supabase responde PGRST202. Nesse caso caimos na
 * busca antiga por `ilike` para nao derrubar a tela, sinalizando via
 * `buscaSimplificada`. Remover este fallback depois de aplicar a 0010
 * (ver docs/MIGRATIONS.md).
 */
export async function searchExercises(
  query: string,
  muscleId?: string | null,
  contexto?: ContextoBusca,
) {
  const supabase = (await criarClienteServidor()) as any

  const { data, error } = await supabase.rpc('search_exercises', {
    p_query: query ?? '',
    p_muscle_id: muscleId || null,
    p_client_id: contexto?.clientId || null,
    p_microcycle_id: contexto?.microcycleId || null,
    p_limit: 30,
  })

  if (!error) {
    return {
      data: (data ?? []).map(mapearResultadoBusca),
      buscaSimplificada: false,
    }
  }

  const funcaoAusente =
    error.code === 'PGRST202' || /search_exercises/i.test(error.message ?? '')

  if (!funcaoAusente) {
    console.error('Error searching exercises (RPC):', error)
    return { data: [], buscaSimplificada: false }
  }

  console.warn(
    'RPC search_exercises indisponivel — migration 0010 provavelmente nao ' +
      'aplicada. Usando busca simplificada (ilike), sem unaccent, trigram ou ' +
      'anotacoes. Ver docs/MIGRATIONS.md.',
  )

  return { ...(await buscarExerciciosSimplificado(query, muscleId)), buscaSimplificada: true }
}

/** Normaliza as colunas `out_*` da RPC para o shape que a UI consome. */
function mapearResultadoBusca(linha: any) {
  return {
    id: linha.out_exercise_id as string,
    name_pt: linha.out_name_pt as string,
    aliases_pt: null,
    primary_muscle_id: null,
    primary_muscle: linha.out_primary_muscle as string | null,
    movement_pattern: linha.out_movement_pattern as string | null,
    equipment: (linha.out_equipment ?? []) as string[],
    technical_level: linha.out_technical_level as string | null,
    has_restriction: Boolean(linha.out_has_restriction),
    missing_equipment: Boolean(linha.out_missing_equipment),
    already_prescribed: Boolean(linha.out_already_prescribed),
    weekly_volume_series: Number(linha.out_weekly_volume_series ?? 0),
  }
}

/** Busca de contingencia, sem as capacidades da 0010. */
async function buscarExerciciosSimplificado(query: string, muscleId?: string | null) {
  const supabase = (await criarClienteServidor()) as any

  let q = supabase.from('exercises').select('id, name_pt, aliases_pt, primary_muscle_id')

  if (query.trim().length > 0) {
    q = q.ilike('name_pt', `%${query}%`)
  }
  if (muscleId) {
    q = q.eq('primary_muscle_id', muscleId)
  }

  const { data, error } = await q.limit(30)

  if (error) {
    console.error('Error searching exercises (fallback):', error)
    return { data: [] }
  }

  return { data: data ?? [] }
}

/**
 * Retorna o próximo order_index livre de uma sessão.
 * Mantém a mesma convenção de addPrescriptionItem (começa em 1).
 */
async function proximoOrderIndex(supabase: any, sessionId: string): Promise<number> {
  const { data } = await supabase
    .from('prescription_items')
    .select('order_index')
    .eq('session_id', sessionId)
    .order('order_index', { ascending: false })
    .limit(1)
    .maybeSingle()

  return data?.order_index ? data.order_index + 1 : 1
}

/**
 * Move um item de prescrição para outra sessão (aba A-G).
 * Reatribui session_id e recalcula order_index para o fim da sessão destino.
 */
export async function movePrescriptionItem(itemId: string, targetSessionId: string) {
  const supabase = (await criarClienteServidor()) as any

  const nextOrder = await proximoOrderIndex(supabase, targetSessionId)

  const { error } = await supabase
    .from('prescription_items')
    .update({ session_id: targetSessionId, order_index: nextOrder })
    .eq('id', itemId)

  if (error) {
    console.error('Error moving prescription item:', error)
    return { error: 'Failed to move item.' }
  }

  revalidatePath('/periodizacoes/[periodizationId]', 'page')
  return { success: true }
}

/**
 * Copia um item de prescrição para outra sessão, preservando as variáveis
 * de prescrição (séries, reps, carga, RIR, RPE, pausa, tempo, método).
 */
export async function copyPrescriptionItem(itemId: string, targetSessionId: string) {
  const supabase = (await criarClienteServidor()) as any

  const { data: origem, error: fetchError } = await supabase
    .from('prescription_items')
    .select('*')
    .eq('id', itemId)
    .single()

  if (fetchError || !origem) {
    console.error('Error loading prescription item to copy:', fetchError)
    return { error: 'Failed to load item.' }
  }

  const nextOrder = await proximoOrderIndex(supabase, targetSessionId)

  const { data, error } = await supabase
    .from('prescription_items')
    .insert({
      session_id: targetSessionId,
      exercise_id: origem.exercise_id,
      exercise_variant_id: origem.exercise_variant_id,
      order_index: nextOrder,
      series: origem.series,
      reps_min: origem.reps_min,
      reps_max: origem.reps_max,
      load_kg: origem.load_kg,
      percent_1rm: origem.percent_1rm,
      rir_target: origem.rir_target,
      rpe_target: origem.rpe_target,
      rest_seconds: origem.rest_seconds,
      tempo_eccentric_s: origem.tempo_eccentric_s,
      tempo_pause_stretched_s: origem.tempo_pause_stretched_s,
      tempo_concentric_s: origem.tempo_concentric_s,
      tempo_pause_shortened_s: origem.tempo_pause_shortened_s,
      range_of_motion: origem.range_of_motion,
      intentional_velocity: origem.intentional_velocity,
      method_id: origem.method_id,
      is_warmup: origem.is_warmup,
      is_working_set: origem.is_working_set,
      notes: origem.notes,
    })
    .select()
    .single()

  if (error) {
    console.error('Error copying prescription item:', error)
    return { error: 'Failed to copy item.' }
  }

  revalidatePath('/periodizacoes/[periodizationId]', 'page')
  return { data }
}

export async function updatePrescriptionOrder(items: { id: string; order_index: number; session_id: string }[]) {
  const supabase = (await criarClienteServidor()) as any

  // Para garantir o RLS da tabela de prescription_items, precisaríamos do workout_sessions_id
  // Mas como a key do objeto é `id`, o onConflict vai atualizar
  const { error } = await supabase
    .from('prescription_items')
    .upsert(
      items.map(item => ({
        id: item.id,
        order_index: item.order_index,
        session_id: item.session_id,
      })),
      { onConflict: 'id' }
    )

  if (error) {
    console.error('Error updating prescription order:', error)
    return { error: 'Failed to update order.' }
  }

  return { success: true }
}

