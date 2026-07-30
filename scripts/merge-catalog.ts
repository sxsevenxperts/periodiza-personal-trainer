import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

async function merge() {
  const exercisesDir = path.join(process.cwd(), 'data', 'exercises');
  const files = await readdir(exercisesDir);
  
  const catalog: { exercicios: Record<string, unknown>[], variantes: Record<string, unknown>[] } = { exercicios: [], variantes: [] };
  
  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    const content = await readFile(path.join(exercisesDir, file), 'utf8');
    const data = JSON.parse(content);
    if (data.exercicios) catalog.exercicios.push(...data.exercicios);
    if (data.variantes) catalog.variantes.push(...data.variantes);
  }
  
  await writeFile(path.join(process.cwd(), 'data', 'catalog.json'), JSON.stringify(catalog, null, 2));
  console.log(`Merged ${catalog.exercicios.length} exercises and ${catalog.variantes.length} variants into catalog.json`);
}

merge().catch(console.error);
