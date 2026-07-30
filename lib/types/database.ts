/**
 * Tipos do banco consumidos pelos clientes Supabase (`createServerClient<Database>`).
 *
 * DEBITO TECNICO CONHECIDO: ainda nao geramos os tipos reais. O correto e rodar
 * `supabase gen types typescript --project-id <id> > lib/types/database.ts` e
 * substituir a linha abaixo.
 *
 * Por que `any` e nao um shape parcial: o generico do @supabase/ssr espera um
 * `GenericSchema` completo. Um shape parcial faz o inferimento de `.from()` /
 * `.select()` colapsar e derruba a tipagem de todas as queries do projeto —
 * exatamente a regressao registrada no DIARIO_DE_BORDO em 2026-07-30.
 * A excecao do lint fica restrita a esta linha, de proposito.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any
