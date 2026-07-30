'use server'

import { criarClienteServidor } from '@/lib/supabase/server'

export async function getAluno(clientId: string) {
  const supabase = await criarClienteServidor()
  
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .single()

  if (error) {
    console.error('Erro ao buscar aluno:', error)
    return null
  }

  return data
}

export async function getAnamnese(clientId: string) {
  const supabase = await criarClienteServidor()
  
  const { data, error } = await supabase
    .from('client_anamnesis')
    .select('*')
    .eq('client_id', clientId)
    .single()

  if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
    console.error('Erro ao buscar anamnese:', error)
    return null
  }

  return data
}

export async function saveAnamnese(clientId: string, notes: string) {
  const supabase = await criarClienteServidor()
  
  const { error } = await supabase
    .from('client_anamnesis')
    .upsert(
      { client_id: clientId, notes },
      { onConflict: 'client_id' }
    )

  if (error) {
    console.error('Erro ao salvar anamnese:', error)
    return { error: 'Falha ao salvar' }
  }

  return { success: true }
}
