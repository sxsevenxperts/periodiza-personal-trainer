/**
 * PLACEHOLDER — este arquivo sera SUBSTITUIDO integralmente pelos tipos gerados
 * a partir do schema real do Supabase. Nao edite a mao depois da geracao.
 *
 * Gerar com o projeto remoto:
 *   npx supabase gen types typescript --project-id <PROJECT_ID> --schema public \
 *     > lib/types/database.ts
 *
 * Gerar com o stack local:
 *   npx supabase gen types typescript --local --schema public > lib/types/database.ts
 *
 * Enquanto as migrations nao existem, o tipo abaixo e permissivo de proposito:
 * qualquer nome de tabela e aceito e as linhas sao `Record<string, Json>`. Isso
 * mantem `tsc --noEmit` verde sem mentir sobre colunas que ainda nao existem.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

type LinhaGenerica = Record<string, Json>

export interface Database {
  public: {
    Tables: {
      [tabela: string]: {
        Row: LinhaGenerica
        Insert: LinhaGenerica
        Update: LinhaGenerica
        Relationships: []
      }
    }
    Views: {
      [view: string]: {
        Row: LinhaGenerica
        Relationships: []
      }
    }
    Functions: {
      [funcao: string]: {
        Args: LinhaGenerica
        Returns: Json
      }
    }
    Enums: {
      [enumerado: string]: string
    }
    CompositeTypes: {
      [tipo: string]: LinhaGenerica
    }
  }
}

/** Atalho para a linha de uma tabela: `Tabela<'exercises'>`. */
export type Tabela<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

/** Atalho para o payload de insercao: `NovaLinha<'exercises'>`. */
export type NovaLinha<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']
