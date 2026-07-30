/**
 * Tipos de dominio consumidos pela UI.
 *
 * Enquanto `lib/types/database.ts` nao tiver os tipos gerados pelo Supabase
 * (`supabase gen types typescript`), estes shapes descrevem exatamente os
 * campos que os componentes leem. Sao intencionalmente parciais: cobrem o que
 * a tela usa, nao a linha inteira da tabela.
 */

/** Item de taxonomia usado nos filtros do catalogo (padroes, regioes, musculos). */
export interface ItemTaxonomia {
  id: string
  slug: string
  name_pt: string
}

/** Referencia simples a uma tabela de taxonomia, como vem de um join do Supabase. */
export interface ReferenciaNomeada {
  name_pt: string | null
}

/** Exercicio do catalogo, na forma exibida pelo card da listagem. */
export interface ExercicioCatalogo {
  id: string
  name_pt: string
  catalog_group: string | null
  equipment_slugs: string[] | null
  variantCount?: number
  movement_patterns?: ReferenciaNomeada | null
  muscles?: ReferenciaNomeada | null
  body_regions?: ReferenciaNomeada | null
}

/** Metadados de taxonomia que alimentam os selects de filtro do catalogo. */
export interface MetadataCatalogo {
  patterns: ItemTaxonomia[]
  regions: ItemTaxonomia[]
  muscles: ItemTaxonomia[]
}

/** Exercicio no formato retornado pela busca do catalogo lateral do builder. */
export interface ExercicioBusca {
  id: string
  name_pt: string
  aliases_pt?: string[] | null
  primary_muscle_id?: string | null
}

/** Avaliacao fisica, na forma exibida pela listagem do aluno. */
export interface AvaliacaoResumo {
  id: string
  assessment_date: string
  notes: string | null
}

/** Aluno, na forma minima usada pelos seletores de formulario. */
export interface AlunoOpcao {
  id: string
  name: string
}

/** Item de prescricao como o aluno o executa na tela de treino. */
export interface ItemExecucao {
  id: string
  order_index: number
  series: number | null
  reps_min: number | null
  reps_max: number | null
  load_kg: number | null
  rir_target: number | null
  rpe_target: number | null
  rest_seconds: number | null
  exercises?: {
    name_pt: string | null
    video_url?: string | null
  } | null
}

/** Sessao (treino) na listagem semanal do aluno. */
export interface SessaoAluno {
  id: string
  label: string
  name: string | null
  status: string | null
  estimated_duration_min: number | null
}

/**
 * Sessao com os itens carregados, usada na tela de execucao.
 * Nao estende SessaoAluno: a query de execucao nao traz
 * `estimated_duration_min`, que so a listagem semanal precisa.
 */
export interface SessaoExecucao {
  id: string
  label: string
  name: string | null
  status: string | null
  prescription_items?: ItemExecucao[] | null
}
