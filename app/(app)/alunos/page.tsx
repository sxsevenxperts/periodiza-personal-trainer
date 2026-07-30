import type { Metadata } from 'next'

import { CabecalhoPagina } from '@/components/layout/cabecalho-pagina'

export const metadata: Metadata = {
  title: 'Alunos',
}

// TODO(alunos): listar `clients` do treinador logado com busca por nome,
// filtro por status e objetivo, e ação de cadastrar aluno (anamnese +
// acesso a equipamentos).
export default function PaginaAlunos() {
  return (
    <>
      <CabecalhoPagina
        titulo="Alunos"
        descricao="Cadastro, anamnese, objetivo, nível de treinamento e equipamentos disponíveis de cada aluno."
      />
      <p className="text-sm text-muted-foreground">
        A lista de alunos será exibida aqui.
      </p>
    </>
  )
}
