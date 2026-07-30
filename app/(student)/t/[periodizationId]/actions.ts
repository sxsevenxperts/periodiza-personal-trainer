'use server'

import { criarClienteServidor } from '@/lib/supabase/server'

export async function getStudentPeriodization(periodizationId: string) {
  const supabase = await criarClienteServidor()
  
  // Como estamos usando UUID como magic link e sem auth de aluno no MVP,
  // precisaremos que o RLS permita SELECT se a role for anônima ou aluno, 
  // O RLS real exigiria que auth.uid() batesse, mas vamos usar um bypass no servidor
  // (idealmente teríamos um token JWT gerado para o aluno, ou usaríamos service_role).
  // Para MVP local, vou usar uma query normal assumindo que RLS de leitura está frouxo 
  // para periodizations conhecendo o UUID.
  
  // Note: Since this is Server Action using the default client, if RLS is strict,
  // we might get no rows. For MVP if it fails, I'll bypass RLS using the service role.
  const { data, error } = await supabase
    .from('periodizations')
    .select(`
      *,
      clients(name),
      mesocycles(
        id, name, weeks, phase,
        microcycles(
          id, week_number, start_date, end_date,
          sessions(
            id, label, name, status, estimated_duration_min
          )
        )
      )
    `)
    .eq('id', periodizationId)
    .single()

  if (error) {
    console.error('Erro ao buscar periodização do aluno:', error)
    return null
  }

  return data
}
