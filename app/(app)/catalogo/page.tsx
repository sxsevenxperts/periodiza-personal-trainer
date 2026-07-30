import type { Metadata } from 'next'

import { CabecalhoPagina } from '@/components/layout/cabecalho-pagina'

export const metadata: Metadata = {
  title: 'Catálogo',
}

// TODO(catalogo): navegar pelos 21 grupos do catálogo, 37 padrões de movimento
// e 12 regiões corporais, com busca full-text em português (unaccent + pg_trgm)
// sobre exercises e suas variants.
export default function PaginaCatalogo() {
  return (
    <>
      <CabecalhoPagina
        titulo="Catálogo de exercícios"
        descricao="Base canônica de exercícios e variantes, organizada por grupo, padrão de movimento, região corporal e equipamento."
      />
      <p className="text-sm text-muted-foreground">
        O catálogo será exibido aqui.
      </p>
    </>
  )
}
