'use server'

import { criarClienteServidor } from '@/lib/supabase/server'

/**
 * Indicadores do dashboard.
 *
 * `null` significa "ainda nao implementado", nao "zero" — a UI distingue os
 * dois. Antes desta action a tela exibia numeros fixos no codigo (12 alunos,
 * 84% de aderencia), que apareceriam identicos para qualquer treinador,
 * inclusive um recem-cadastrado sem nenhum aluno.
 *
 * O escopo por treinador vem do RLS: `clients` filtra por `personal_id` e
 * `periodizations` por organizacao. As contagens abaixo nao adicionam filtro
 * proprio; se o RLS nao estiver ativo, elas contam o que o RLS deixar passar.
 */
export type IndicadoresDashboard = {
  alunosAtivos: number | null
  periodizacoesAtivas: number | null
  /** Fase 4 — depende da agregacao de execucoes. */
  aderenciaSemanal: null
  /** Fase 5 — depende de `workout_executions`. */
  treinosRealizados: null
  /** Preenchido quando alguma contagem falha, para a UI nao mostrar zero falso. */
  erro: string | null
}

export async function getIndicadoresDashboard(): Promise<IndicadoresDashboard> {
  const supabase = await criarClienteServidor()

  const [alunos, periodizacoes] = await Promise.all([
    supabase
      .from('clients')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'ativo'),
    supabase
      .from('periodizations')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'ativa'),
  ])

  const falha = alunos.error ?? periodizacoes.error

  if (falha) {
    console.error('Erro ao carregar indicadores do dashboard:', falha)
  }

  return {
    alunosAtivos: alunos.error ? null : (alunos.count ?? 0),
    periodizacoesAtivas: periodizacoes.error ? null : (periodizacoes.count ?? 0),
    aderenciaSemanal: null,
    treinosRealizados: null,
    erro: falha ? 'Não foi possível carregar os indicadores.' : null,
  }
}
