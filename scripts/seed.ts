/**
 * Seed do catálogo canônico.
 *
 * Uso:
 *   npm run seed
 *
 * Lê `data/taxonomy.json` (taxonomias) e `data/catalog.json` (exercícios e
 * variantes) e faz upsert no Supabase usando a SERVICE ROLE — ou seja, ignora
 * RLS. Rode apenas em ambiente de desenvolvimento ou em deploy controlado.
 *
 * Idempotente por design: todo upsert usa `slug` como chave de conflito, então
 * rodar duas vezes não duplica linha.
 */

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

const RAIZ = process.cwd()
const CAMINHO_TAXONOMIA = path.join(RAIZ, 'data', 'taxonomy.json')
const CAMINHO_CATALOGO = path.join(RAIZ, 'data', 'catalog.json')
const TAMANHO_DO_LOTE = 500

type Registro = Record<string, unknown>

/* -------------------------------------------------------------------------- */
/* Validação dos arquivos de dados                                            */
/* -------------------------------------------------------------------------- */

const registro = z.record(z.unknown())

const esquemaTaxonomia = z.object({
  regioes_corporais: z.array(registro),
  padroes_movimento: z.array(registro),
  musculos: z.array(registro),
  equipamentos: z.array(registro),
  grupos_catalogo: z.array(registro),
  familias_substituicao: z.array(registro),
})

// TODO(catalogo): fechar este esquema quando `data/catalog.json` existir.
// O contrato esperado é `{ exercicios: [...], variantes: [...] }`, cada
// exercício com slug, name_pt, aliases_pt, grupo, padrão de movimento,
// músculo primário, músculos secundários, equipamentos e nível técnico.
const esquemaCatalogo = z.object({
  exercicios: z.array(registro).default([]),
  variantes: z.array(registro).default([]),
})

type Taxonomia = z.infer<typeof esquemaTaxonomia>

/** Ordem de carga: respeita as dependências de chave estrangeira. */
const TABELAS_DE_TAXONOMIA: ReadonlyArray<{
  chave: keyof Taxonomia
  tabela: string
}> = [
  { chave: 'regioes_corporais', tabela: 'body_regions' },
  { chave: 'padroes_movimento', tabela: 'movement_patterns' },
  { chave: 'musculos', tabela: 'muscles' },
  { chave: 'equipamentos', tabela: 'equipment' },
  { chave: 'grupos_catalogo', tabela: 'catalog_groups' },
  { chave: 'familias_substituicao', tabela: 'substitution_families' },
]

/**
 * Tradução de campo do JSON (pt) para coluna do banco (en).
 * TODO(schema): confirmar cada nome de coluna contra as migrations 0001–0004
 * antes do primeiro seed real; campo não mapeado é descartado com aviso.
 */
const MAPA_DE_COLUNAS: Readonly<Record<string, string>> = {
  slug: 'slug',
  nome_pt: 'name_pt',
  nome_en: 'name_en',
  descricao: 'description',
  ordem: 'order_index',
  regiao_corporal: 'body_region_slug',
  padrao_movimento: 'movement_pattern_slug',
  dominancia: 'dominance',
  categoria: 'category',
  criterio: 'criteria',
}

/* -------------------------------------------------------------------------- */
/* Infraestrutura                                                             */
/* -------------------------------------------------------------------------- */

function conectar() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRole) {
    throw new Error(
      'Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY antes de rodar o seed.\n' +
        'Copie .env.example para .env.local e carregue as variáveis no shell.',
    )
  }

  return createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

type Supabase = ReturnType<typeof conectar>

async function lerJson(caminho: string): Promise<unknown> {
  const conteudo = await readFile(caminho, 'utf8')
  return JSON.parse(conteudo) as unknown
}

function ehArquivoAusente(erro: unknown): boolean {
  return (
    typeof erro === 'object' &&
    erro !== null &&
    'code' in erro &&
    (erro as { code?: string }).code === 'ENOENT'
  )
}

function traduzir(item: Registro, origem: string): Registro {
  const linha: Registro = {}

  for (const [campo, valor] of Object.entries(item)) {
    const coluna = MAPA_DE_COLUNAS[campo]
    if (coluna === undefined) {
      console.warn(`  ! campo sem mapeamento em ${origem}: "${campo}" (ignorado)`)
      continue
    }
    linha[coluna] = valor
  }

  return linha
}

async function upsertEmLotes(
  supabase: Supabase,
  tabela: string,
  linhas: Registro[],
  conflito = 'slug',
): Promise<number> {
  let gravadas = 0

  for (let inicio = 0; inicio < linhas.length; inicio += TAMANHO_DO_LOTE) {
    const lote = linhas.slice(inicio, inicio + TAMANHO_DO_LOTE)
    const { error } = await supabase
      .from(tabela)
      .upsert(lote, { onConflict: conflito })

    if (error) {
      throw new Error(`Falha ao gravar em "${tabela}": ${error.message}`)
    }

    gravadas += lote.length
  }

  return gravadas
}

/* -------------------------------------------------------------------------- */
/* Etapas                                                                     */
/* -------------------------------------------------------------------------- */

async function semearTaxonomia(supabase: Supabase): Promise<void> {
  const taxonomia = esquemaTaxonomia.parse(await lerJson(CAMINHO_TAXONOMIA))

  for (const { chave, tabela } of TABELAS_DE_TAXONOMIA) {
    const linhas = taxonomia[chave].map((item) => traduzir(item, chave))
    const total = await upsertEmLotes(supabase, tabela, linhas)
    console.log(`  ${tabela}: ${total} registros`)
  }
}

async function semearCatalogo(supabase: Supabase): Promise<void> {
  let bruto: unknown

  try {
    bruto = await lerJson(CAMINHO_CATALOGO)
  } catch (erro) {
    if (!ehArquivoAusente(erro)) throw erro
    console.warn(
      '  data/catalog.json ainda não existe — etapa de exercícios pulada.\n' +
        '  Gere o catálogo antes de prescrever qualquer treino.',
    )
    return
  }

  const catalogo = esquemaCatalogo.parse(bruto)

  // Checagem de pré-requisito: sem a tabela, o upsert falharia com erro cru.
  const { error: erroDeTabela } = await supabase
    .from('exercises')
    .select('slug', { head: true, count: 'exact' })

  if (erroDeTabela) {
    console.warn(
      `  tabela "exercises" indisponível (${erroDeTabela.message}).\n` +
        '  Aplique as migrations antes de semear o catálogo.',
    )
    return
  }

  // TODO(exercises): mapear cada exercício do catálogo para a linha de
  // `exercises` (slug, name_pt, name_en, aliases_pt, catalog_group_slug,
  // movement_pattern_slug, primary_muscle_slug, equipment_slugs,
  // technical_level, laterality, substitution_family_slug) e gravar com
  // `upsertEmLotes(supabase, 'exercises', linhas)`.
  //
  // Regra inegociável da hierarquia: nenhum campo de prescrição
  // (série, repetição, carga, RIR, RPE, descanso, cadência, método) pode ser
  // gravado em `exercises` nem em `exercise_variants`.
  console.log(`  exercícios lidos: ${catalogo.exercicios.length} (upsert pendente)`)

  // TODO(exercise_variants): mapear as variantes para `exercise_variants`
  // (exercise_slug, slug, name_pt, is_default, equipment_slugs, notas) e
  // gravar com `upsertEmLotes(supabase, 'exercise_variants', linhas)`.
  console.log(`  variantes lidas: ${catalogo.variantes.length} (upsert pendente)`)
}

/* -------------------------------------------------------------------------- */

async function main(): Promise<void> {
  const supabase = conectar()

  console.log('Seed do catálogo canônico')
  console.log('Taxonomia:')
  await semearTaxonomia(supabase)
  console.log('Catálogo:')
  await semearCatalogo(supabase)
  console.log('Concluído.')
}

main().catch((erro: unknown) => {
  const mensagem = erro instanceof Error ? erro.message : String(erro)
  console.error(`\nSeed interrompido: ${mensagem}`)
  process.exitCode = 1
})
