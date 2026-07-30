import type { Metadata } from 'next'
import { CabecalhoPagina } from '@/components/layout/cabecalho-pagina'
import { getCatalogoMetadata, getExercises } from './actions'
import { FiltrosCatalogo } from '@/components/catalogo/filtros-catalogo'
import { ExercicioCard } from '@/components/catalogo/exercicio-card'

export const metadata: Metadata = {
  title: 'Catálogo',
}

export default async function PaginaCatalogo({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const resolvedParams = await searchParams
  
  const metadataPromise = getCatalogoMetadata()
  const exercisesPromise = getExercises({
    q: resolvedParams.q,
    pattern: resolvedParams.pattern,
    region: resolvedParams.region,
    muscle: resolvedParams.muscle,
    page: resolvedParams.page ? parseInt(resolvedParams.page) : 1
  })

  const [metadata, { data: exercises, count }] = await Promise.all([
    metadataPromise,
    exercisesPromise
  ])

  return (
    <>
      <CabecalhoPagina
        titulo="Catálogo de Exercícios"
        descricao="Base canônica de exercícios e variantes, organizada por grupo, padrão de movimento, região corporal e equipamento."
      />
      
      <div className="mt-6">
        <FiltrosCatalogo metadata={metadata} />

        <div className="mb-4 text-sm text-zinc-400">
          Encontrados {count} exercícios
        </div>

        {exercises.length === 0 ? (
          <div className="text-center py-12 text-zinc-500 bg-zinc-900/50 rounded-lg border border-zinc-800">
            Nenhum exercício encontrado com os filtros atuais.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {exercises.map((ex: any) => (
              <ExercicioCard key={ex.id} exercicio={ex} />
            ))}
          </div>
        )}
      </div>
    </>
  )
}
