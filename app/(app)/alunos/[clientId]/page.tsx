import type { Metadata } from 'next'

import { CabecalhoPagina } from '@/components/layout/cabecalho-pagina'

export const metadata: Metadata = {
  title: 'Ficha do aluno',
}

// Next 15: `params` é uma Promise e precisa de await.
interface PaginaAlunoProps {
  params: Promise<{ clientId: string }>
}

// TODO(aluno): carregar o `client` por id (RLS restringe ao treinador dono),
// anamnese, restrições de padrão de movimento, equipamentos liberados,
// periodizações do aluno e histórico de execução.
export default async function PaginaAluno({ params }: PaginaAlunoProps) {
  const { clientId } = await params

  return (
    <>
      <CabecalhoPagina
        titulo="Ficha do aluno"
        descricao="Anamnese, restrições, equipamentos disponíveis e periodizações vinculadas."
      />
      <p className="text-sm text-muted-foreground">
        Aluno <code className="font-mono text-foreground">{clientId}</code>. Dados
        da ficha serão exibidos aqui.
      </p>
    </>
  )
}
