import { readFile, writeFile } from 'node:fs/promises';

async function fixSeed() {
  const content = await readFile('scripts/seed.ts', 'utf8');
  
  // 1. Change MAPA_DE_COLUNAS
  let newContent = content.replace(
    "regiao_corporal: 'body_region_slug',",
    "regiao_corporal: 'body_region_slug', // Will be mapped to body_region_id"
  ).replace(
    "padrao_movimento: 'movement_pattern_slug',",
    "padrao_movimento: 'movement_pattern_slug', // Will be mapped to movement_pattern_id"
  );
  
  // 2. Add dictionary for slugs to ids
  const dictCode = `
const idCache: Record<string, Record<string, string>> = {};

async function loadIds(supabase: Supabase, table: string) {
  const { data, error } = await supabase.from(table).select('id, slug');
  if (error) throw error;
  idCache[table] = {};
  for (const row of data || []) {
    idCache[table][row.slug] = row.id;
  }
}
`;
  
  newContent = newContent.replace('function traduzir(', dictCode + '\nfunction traduzir(');
  
  // 3. Update traduzir to resolve slugs
  const resolveCode = `
    if (coluna === 'body_region_slug' && idCache['body_regions']) {
      linha['body_region_id'] = idCache['body_regions'][valor as string];
      continue;
    }
    if (coluna === 'movement_pattern_slug' && idCache['movement_patterns']) {
      linha['movement_pattern_id'] = idCache['movement_patterns'][valor as string];
      continue;
    }
`;
  newContent = newContent.replace('linha[coluna] = valor', resolveCode + '    linha[coluna] = valor');
  
  // 4. Update semearTaxonomia to load ids after each table
  const newSemear = `
  for (const { chave, tabela } of TABELAS_DE_TAXONOMIA) {
    const linhas = taxonomia[chave].map((item) => traduzir(item, chave))
    const total = await upsertEmLotes(supabase, tabela, linhas)
    console.log(\`  \${tabela}: \${total} registros\`)
    await loadIds(supabase, tabela);
  }
`;
  newContent = newContent.replace(/for \(const \{ chave, tabela \} of TABELAS_DE_TAXONOMIA\) \{[\s\S]*?console\.log[^}]*\}/, newSemear.trim());
  
  await writeFile('scripts/seed.ts', newContent);
}

fixSeed().catch(console.error);
