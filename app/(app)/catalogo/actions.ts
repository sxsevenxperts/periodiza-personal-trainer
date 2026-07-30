'use server'

import { criarClienteServidor } from '@/lib/supabase/server'

export async function getCatalogoMetadata() {
  const supabase = await criarClienteServidor()
  
  const [patternsResult, regionsResult, musclesResult] = await Promise.all([
    supabase.from('movement_patterns').select('id, name_pt, slug').order('name_pt'),
    supabase.from('body_regions').select('id, name_pt, slug').order('name_pt'),
    supabase.from('muscles').select('id, name_pt, slug').order('name_pt'),
  ])

  return {
    patterns: patternsResult.data || [],
    regions: regionsResult.data || [],
    muscles: musclesResult.data || [],
  }
}

export async function getExercises(params: {
  q?: string
  pattern?: string
  region?: string
  muscle?: string
  page?: number
}) {
  const supabase = await criarClienteServidor()
  const itemsPerPage = 20
  const page = params.page || 1
  const from = (page - 1) * itemsPerPage
  const to = from + itemsPerPage - 1

  let query = supabase
    .from('exercises')
    .select(`
      id,
      slug,
      name_pt,
      catalog_group,
      equipment_slugs,
      movement_patterns!inner ( id, slug, name_pt ),
      body_regions!inner ( id, slug, name_pt ),
      muscles!inner ( id, slug, name_pt )
    `, { count: 'exact' })

  if (params.q) {
    // Busca trgm em name_pt
    query = query.ilike('name_pt', `%${params.q}%`)
  }
  
  if (params.pattern) {
    query = query.eq('movement_patterns.slug', params.pattern)
  }
  if (params.region) {
    query = query.eq('body_regions.slug', params.region)
  }
  if (params.muscle) {
    query = query.eq('muscles.slug', params.muscle)
  }

  query = query.order('name_pt').range(from, to)

  const { data, error, count } = await query

  if (error) {
    console.error('Erro ao buscar exercícios:', error)
    return { data: [], count: 0 }
  }

  // Obter contagem de variantes para cada exercício retornado
  if (data && data.length > 0) {
    const exerciseIds = data.map(e => e.id)
    const { data: variants } = await supabase
      .from('exercise_variants')
      .select('exercise_id')
      .in('exercise_id', exerciseIds)
      
    // Anexar contagem ao dado
    const mappedData = data.map(exercise => {
      const variantCount = variants?.filter(v => v.exercise_id === exercise.id).length || 0
      return {
        ...exercise,
        variantCount
      }
    })
    
    return { data: mappedData, count: count || 0, totalPages: Math.ceil((count || 0) / itemsPerPage) }
  }

  return { data: [], count: 0, totalPages: 0 }
}
