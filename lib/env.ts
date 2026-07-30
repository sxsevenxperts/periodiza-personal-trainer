import { z } from 'zod'

/**
 * Leitura tipada das variaveis de ambiente. Falha alto e cedo, com mensagem em
 * portugues, em vez de deixar o Supabase estourar um erro generico de rede.
 *
 * As variaveis `NEXT_PUBLIC_*` precisam ser lidas de forma literal
 * (`process.env.NEXT_PUBLIC_X`) para o Next conseguir inline-las no bundle do
 * browser — por isso o objeto e montado campo a campo.
 */

const esquemaPublico = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url('NEXT_PUBLIC_SUPABASE_URL precisa ser uma URL valida.'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY nao pode ficar vazia.'),
})

const esquemaServidor = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, 'SUPABASE_SERVICE_ROLE_KEY nao pode ficar vazia.'),
})

export type EnvPublico = z.infer<typeof esquemaPublico>
export type EnvServidor = z.infer<typeof esquemaServidor>

function formatarErro(erro: z.ZodError): string {
  const detalhes = erro.issues
    .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
    .join('\n')
  return `Variaveis de ambiente invalidas ou ausentes:\n${detalhes}\n\nCopie .env.example para .env.local e preencha os valores.`
}

/** Variaveis seguras para o browser. Disponiveis no client e no server. */
export function envPublico(): EnvPublico {
  const resultado = esquemaPublico.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  })

  if (!resultado.success) {
    throw new Error(formatarErro(resultado.error))
  }

  return resultado.data
}

/** Segredos que so podem ser lidos no servidor (scripts e rotinas admin). */
export function envServidor(): EnvServidor {
  const resultado = esquemaServidor.safeParse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  })

  if (!resultado.success) {
    throw new Error(formatarErro(resultado.error))
  }

  return resultado.data
}
