import { readFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(url, key, { auth: { persistSession: false } });

function slugify(text: string) {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
}

async function main() {
  console.log('Loading database taxonomy IDs...');
  
  const [
    { data: mps }, { data: brs }, { data: muscles }, { data: equips }
  ] = await Promise.all([
    supabase.from('movement_patterns').select('id, slug'),
    supabase.from('body_regions').select('id, slug'),
    supabase.from('muscles').select('id, slug, name_pt'),
    supabase.from('equipment').select('id, slug, name_pt')
  ]);

  const mapMp = Object.fromEntries(mps!.map(m => [m.slug, m.id]));
  const mapBr = Object.fromEntries(brs!.map(m => [m.slug, m.id]));
  
  // For muscles and equipment, try slug first, then fallback to name_pt slugified
  const mapMuscle = Object.fromEntries(muscles!.map(m => [m.slug, m.id]));
  for (const m of muscles!) { mapMuscle[slugify(m.name_pt)] = m.id; }
  
  const mapEquip = Object.fromEntries(equips!.map(m => [m.slug, m.id]));
  for (const m of equips!) { mapEquip[slugify(m.name_pt)] = m.id; }

  const catalogStr = await readFile('data/catalog.json', 'utf8');
  const catalog = JSON.parse(catalogStr);

  const rows = [];
  for (const ex of catalog.exercicios) {
    // resolve foreign keys
    let mpId = null, brId = null, pMuscId = null;
    if (ex.padrao_movimento) mpId = mapMp[ex.padrao_movimento];
    if (ex.regiao_corporal) brId = mapBr[ex.regiao_corporal];
    
    if (ex.musculo_primario) {
      const slug = slugify(ex.musculo_primario);
      pMuscId = mapMuscle[slug];
      if (!pMuscId) console.warn(`Missing muscle: ${ex.musculo_primario} (${slug})`);
    }

    const sMuscIds = (ex.musculos_secundarios || [])
      .map((m: string) => mapMuscle[slugify(m)])
      .filter(Boolean);

    const equipSlugs = (ex.equipamentos || [])
      .map((e: string) => slugify(e)); // Assuming equipment_slugs is text[]

    rows.push({
      slug: ex.slug,
      name_pt: ex.nome_pt,
      name_en: ex.nome_en || ex.slug,
      aliases_pt: ex.aliases_pt || [],
      catalog_group: ex.grupo_catalogo,
      movement_pattern_id: mpId,
      body_region_id: brId,
      dominance: ex.dominancia,
      primary_muscle_id: pMuscId,
      secondary_muscle_ids: sMuscIds,
      equipment_slugs: equipSlugs,
      load_type: ex.tipo_carga,
      technical_level: ex.nivel_tecnico,
      dominant_plane: ex.plano_predominante,
      kinetic_chain: ex.cadeia_cinetica,
      laterality: ex.lateralidade,
      metric: ex.metrica,
      stability_demand: ex.estabilidade_exigida,
      resistance_curve: ex.curva_resistencia,
      body_position: ex.posicao_corporal,
      default_range_of_motion: ex.amplitude_padrao,
      technical_cues: ex.alertas_tecnicos || [],
      contraindications: ex.contraindicacoes || [],
      is_active: true
    });
  }

  console.log(`Upserting ${rows.length} exercises...`);
  
  for (let i = 0; i < rows.length; i += 100) {
    const batch = rows.slice(i, i + 100);
    const { error } = await supabase.from('exercises').upsert(batch, { onConflict: 'slug' });
    if (error) {
      console.error('Error in batch upsert:', error);
    } else {
      console.log(`Inserted ${i + batch.length}/${rows.length}`);
    }
  }
}

main().catch(console.error);
