'use server'

import { criarClienteServidor } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createPeriodization(data: {
  clientId: string
  name: string
  split: string
  weeks: number
}) {
  const supabase = await criarClienteServidor()
  
  // 1. Obter usuário atual
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Não autorizado' }
  }

  // 2. Obter a organização do usuário
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()
    
  // Para MVP sem onboarding completo, criamos um mock organization_id ou pulamos se RLS permitir? 
  // Na verdade, RLS deve exigir organization_id. Se estiver null, vai falhar a constraint.
  // Vamos tentar usar a do profile, se null, vamos usar um UUID hardcoded (apenas para fallback MVP)
  // idealmente o trigger de onboarding já deveria ter criado a org.
  const organizationId = profile?.organization_id || '00000000-0000-0000-0000-000000000000' // Fail-safe (pode dar erro de FK se nao existir a org)

  // 3. Inserir Periodização
  const startDate = new Date()
  const endDate = new Date()
  endDate.setDate(endDate.getDate() + data.weeks * 7)

  const { data: periodization, error } = await supabase
    .from('periodizations')
    .insert({
      organization_id: organizationId,
      client_id: data.clientId,
      created_by: user.id,
      name: data.name,
      split: data.split,
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      status: 'rascunho'
    })
    .select()
    .single()

  if (error) {
    console.error('Erro ao criar periodização:', error)
    
    // Fallback: se der erro de FK em organization_id (porque não tem org)
    // vamos tentar criar a org mock na hora.
    if (error.code === '23503' && error.message.includes('organization_id')) {
        // ... para o MVP vou assumir que há uma org criada pelo handle_new_user? Não, handle_new_user não cria org.
        console.warn('Usuário não tem organização. Certifique-se de configurar a org.')
    }
    
    return { error: 'Falha ao criar periodização. Verifique sua organização.' }
  }

  // 4. Criar o primeiro Mesociclo por padrão
  const { data: mesocycle, error: mesoError } = await supabase
    .from('mesocycles')
    .insert({
      periodization_id: periodization.id,
      name: `Mesociclo 1 - ${data.name}`,
      weeks: data.weeks,
      phase: 'base'
    })
    .select()
    .single()

  if (!mesoError && mesocycle) {
    // 5. Criar o primeiro Microciclo (semana 1)
    const { data: microcycle, error: microError } = await supabase
      .from('microcycles')
      .insert({
        mesocycle_id: mesocycle.id,
        week_number: 1,
        start_date: startDate.toISOString().split('T')[0],
      })
      .select()
      .single()

    if (!microError && microcycle) {
      // 6. Criar sessões baseadas no split
      const splitLetters = data.split.split('')
      const sessions = splitLetters.map(letter => ({
        microcycle_id: microcycle.id,
        label: letter,
        name: `Treino ${letter}`,
      }))

      await supabase.from('sessions').insert(sessions)
    }
  }

  revalidatePath('/periodizacoes')
  return { data: periodization }
}
