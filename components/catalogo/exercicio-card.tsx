import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dumbbell, Layers } from 'lucide-react'
import type { ExercicioCatalogo } from '@/lib/types/dominio'

interface ExercicioCardProps {
  exercicio: ExercicioCatalogo
}

export function ExercicioCard({ exercicio }: ExercicioCardProps) {
  return (
    <Card className="bg-zinc-900 border-zinc-800 overflow-hidden hover:border-amber-500/50 transition-colors">
      <CardContent className="p-5">
        <div className="flex justify-between items-start gap-4">
          <div>
            <h3 className="font-bold text-lg text-zinc-100">{exercicio.name_pt}</h3>
            {exercicio.catalog_group && (
              <p className="text-sm text-zinc-400 mt-1">{exercicio.catalog_group}</p>
            )}
          </div>
          
          {!!exercicio.variantCount && exercicio.variantCount > 0 && (
            <Badge variant="outline" className="shrink-0 bg-zinc-950 border-zinc-800 text-zinc-300 gap-1">
              <Layers className="w-3 h-3" />
              {exercicio.variantCount} {exercicio.variantCount === 1 ? 'Variante' : 'Variantes'}
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          <Badge className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border-0">
            {exercicio.movement_patterns?.name_pt}
          </Badge>
          <Badge className="bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border-0">
            {exercicio.muscles?.name_pt}
          </Badge>
          <Badge variant="outline" className="border-zinc-700 text-zinc-400">
            {exercicio.body_regions?.name_pt}
          </Badge>
        </div>

        {exercicio.equipment_slugs && exercicio.equipment_slugs.length > 0 && (
          <div className="mt-4 pt-4 border-t border-zinc-800/50 flex items-center gap-2 text-sm text-zinc-500">
            <Dumbbell className="w-4 h-4" />
            <div className="flex flex-wrap gap-1">
              {exercicio.equipment_slugs.map((eq: string) => (
                <span key={eq} className="capitalize">{eq.replace(/-/g, ' ')}</span>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
