'use client'

import { Search, X } from 'lucide-react'

export interface ExerciseFilter {
  query: string
  category?: string
  movement?: string
  muscle?: string
  equipment?: string
  level?: string
  onlyAvailable: boolean
}

interface ExerciseSearchProps {
  filters: ExerciseFilter
  onFilterChange: (filters: ExerciseFilter) => void
  categories: string[]
  movements: string[]
  muscles: string[]
  equipments: string[]
}

export function ExerciseSearch({
  filters,
  onFilterChange,
  _categories,
  _movements,
  _muscles,
  _equipments,
}: ExerciseSearchProps) {
  const handleQueryChange = (query: string) => {
    onFilterChange({ ...filters, query })
  }

  const handleFilterChange = (key: string, value: string | boolean | undefined) => {
    onFilterChange({ ...filters, [key]: value })
  }

  const clearAllFilters = () => {
    onFilterChange({
      query: '',
      category: undefined,
      movement: undefined,
      muscle: undefined,
      equipment: undefined,
      level: undefined,
      onlyAvailable: false,
    })
  }

  return (
    <div className="border-b border-neutral-800 bg-neutral-900 p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600" size={18} />
          <input
            id="exercise-search-input"
            type="text"
            placeholder="Buscar exercício... (/ para focar)"
            value={filters.query}
            onChange={(e) => handleQueryChange(e.target.value)}
            className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2 pl-10 text-neutral-100 placeholder-neutral-600 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500 whitespace-nowrap">Adicionar em:</span>
          <select className="bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-sm text-neutral-100 focus:border-primary focus:outline-none">
            {['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((label) => (
              <option key={label} value={label}>
                Treino {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <select value={filters.category || ''} onChange={(e) => handleFilterChange('category', e.target.value || undefined)} className="bg-neutral-800 border border-neutral-700 rounded px-3 py-1 text-xs text-neutral-100 focus:border-primary focus:outline-none">
          <option value="">Grupo</option>
          {categories.map((cat) => (<option key={cat} value={cat}>{cat}</option>))}
        </select>

        <select value={filters.movement || ''} onChange={(e) => handleFilterChange('movement', e.target.value || undefined)} className="bg-neutral-800 border border-neutral-700 rounded px-3 py-1 text-xs text-neutral-100 focus:border-primary focus:outline-none">
          <option value="">Padrão</option>
          {movements.map((mov) => (<option key={mov} value={mov}>{mov}</option>))}
        </select>

        <select value={filters.muscle || ''} onChange={(e) => handleFilterChange('muscle', e.target.value || undefined)} className="bg-neutral-800 border border-neutral-700 rounded px-3 py-1 text-xs text-neutral-100 focus:border-primary focus:outline-none">
          <option value="">Músculo</option>
          {muscles.map((mus) => (<option key={mus} value={mus}>{mus}</option>))}
        </select>

        <label className="flex items-center gap-2 px-3 py-1 bg-neutral-800 border border-neutral-700 rounded text-xs text-neutral-300 cursor-pointer hover:bg-neutral-700">
          <input type="checkbox" checked={filters.onlyAvailable} onChange={(e) => handleFilterChange('onlyAvailable', e.target.checked)} className="w-4 h-4 rounded" />
          Só o que o aluno tem
        </label>

        {(filters.query || filters.category || filters.movement || filters.muscle || filters.onlyAvailable) && (
          <button onClick={clearAllFilters} className="px-2 py-1 text-xs text-neutral-400 hover:text-neutral-200 flex items-center gap-1">
            <X size={14} /> Limpar
          </button>
        )}
      </div>
    </div>
  )
}
