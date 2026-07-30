import type { Metadata } from 'next'

import { CabecalhoPagina } from '@/components/layout/cabecalho-pagina'

export const metadata: Metadata = {
  title: 'Configurações',
}

// TODO(configuracoes): perfil do treinador, preferências de prescrição
// (unidades, cadência padrão, RIR alvo por objetivo), tema claro/escuro,
// equipe e encerramento de sessão.
export default function PaginaConfiguracoes() {
  return (
    <>
      <CabecalhoPagina
        titulo="Configurações"
        descricao="Perfil profissional, preferências de prescrição e preferências da conta."
      />
      <p className="text-sm text-muted-foreground">
        As configurações serão exibidas aqui.
      </p>
    </>
  )
}
