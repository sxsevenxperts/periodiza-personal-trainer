'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useDebounce } from '@/hooks/use-debounce'
import { Search } from 'lucide-react'
import type { MetadataCatalogo } from '@/lib/types/dominio'

interface FiltrosCatalogoProps {
  metadata: MetadataCatalogo
}

export function FiltrosCatalogo({ metadata }: FiltrosCatalogoProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [query, setQuery] = useState(searchParams.get('q') || '')
  const debouncedQuery = useDebounce(query, 500)

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value && value !== 'all') {
        params.set(name, value)
      } else {
        params.delete(name)
      }
      // Resetar página ao mudar filtros
      if (name !== 'page') params.delete('page')
      return params.toString()
    },
    [searchParams]
  )

  useEffect(() => {
    if (debouncedQuery !== searchParams.get('q') && (debouncedQuery !== '' || searchParams.has('q'))) {
      router.push(`${pathname}?${createQueryString('q', debouncedQuery)}`)
    }
  }, [debouncedQuery, pathname, router, createQueryString, searchParams])

  return (
    <div className="flex flex-col md:flex-row gap-4 mb-8">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <Input
          placeholder="Buscar exercícios..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9 bg-zinc-900 border-zinc-800"
        />
      </div>

      <div className="flex flex-wrap md:flex-nowrap gap-4">
        <Select 
          value={searchParams.get('region') || 'all'} 
          onValueChange={(val) => router.push(`${pathname}?${createQueryString('region', val)}`)}
        >
          <SelectTrigger className="w-full md:w-[180px] bg-zinc-900 border-zinc-800">
            <SelectValue placeholder="Região" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-h-[300px]">
            <SelectItem value="all">Todas as Regiões</SelectItem>
            {metadata.regions.map(r => (
              <SelectItem key={r.id} value={r.slug}>{r.name_pt}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select 
          value={searchParams.get('muscle') || 'all'} 
          onValueChange={(val) => router.push(`${pathname}?${createQueryString('muscle', val)}`)}
        >
          <SelectTrigger className="w-full md:w-[180px] bg-zinc-900 border-zinc-800">
            <SelectValue placeholder="Músculo" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-h-[300px]">
            <SelectItem value="all">Todos os Músculos</SelectItem>
            {metadata.muscles.map(m => (
              <SelectItem key={m.id} value={m.slug}>{m.name_pt}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select 
          value={searchParams.get('pattern') || 'all'} 
          onValueChange={(val) => router.push(`${pathname}?${createQueryString('pattern', val)}`)}
        >
          <SelectTrigger className="w-full md:w-[220px] bg-zinc-900 border-zinc-800">
            <SelectValue placeholder="Padrão de Mov." />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-h-[300px]">
            <SelectItem value="all">Todos os Padrões</SelectItem>
            {metadata.patterns.map(p => (
              <SelectItem key={p.id} value={p.slug}>{p.name_pt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
