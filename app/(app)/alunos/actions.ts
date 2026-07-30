'use server'

import { criarClienteServidor } from '@/lib/supabase/server'

export async function getAlunos() {
  const supabase = await criarClienteServidor()
  
  // No mundo real, RLS cuidaria do filtro por personal_id
  const { data, error } = await supabase
    .from('clients')
    .select('id, name, status')
    .order('name')

  if (error) {
    console.error('Erro ao buscar alunos:', error)
    return []
  }

  return data || []
}

import { revalidatePath } from 'next/cache'

export async function createNewAluno(name: string) {
  const supabase = await criarClienteServidor()
  
  // We fetch the current user's personal_id. 
  // For MVP, we need to know the logged-in user.
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Usuário não autenticado' }
  }

  // Assuming user.id is the personal_id in `clients`
  const { data, error } = await supabase
    .from('clients')
    .insert({
      name,
      personal_id: user.id, // For MVP, assuming user.id is the personal_id
      status: 'ativo'
    })
    .select()
    .single()

  if (error) {
    console.error('Erro ao criar aluno:', error)
    return { error: 'Falha ao criar aluno' }
  }

  revalidatePath('/alunos')
  return { data }
}
