import { z } from 'zod'

/**
 * Leitura tipada das variaveis de ambiente. Falha alto e cedo, com mensagem em
 * portugues, em vez de deixar o Supabase estourar um erro generico de rede.
 *
 * As variaveis `NEXT_PUBLIC_*` precisam ser lidas de forma literal
 * (`process.env.NEXT_PUBLIC_X`) para o Next conseguir inline-las no bundle do
 * browser — por isso o objeto e montado campo a campo.
 */

/**
 * Nome fixo do cookie de sessao.
 *
 * Por padrao o `@supabase/supabase-js` deriva esse nome do hostname:
 *
 *     const defaultStorageKey = `sb-${baseUrl.hostname.split('.')[0]}-auth-token`
 *
 * Num Supabase gerenciado isso da o "project ref" e e estavel. Num Supabase
 * **auto-hospedado** e uma armadilha, por dois motivos:
 *
 * 1. O nome passa a depender do dominio. Trocar o dominio do Supabase — ou
 *    passar a acessa-lo por IP — muda o nome do cookie e desloga todo mundo,
 *    sem nenhum erro visivel.
 * 2. Se o servidor falar com o Supabase pela rede interna do Docker
 *    (`http://supabase-kong:8000`) e o browser pelo dominio publico, os dois
 *    lados calculam nomes DIFERENTES (`sb-supabase-kong-auth-token` vs
 *    `sb-meu-supabase-auth-token`). O servidor nunca encontra o cookie que o
 *    browser gravou: o login "funciona" e a proxima navegacao volta para a tela
 *    de login, em loop.
 *
 * Fixar o nome elimina os dois problemas e e pre-requisito para o split de URL
 * publica/interna descrito em `urlSupabaseServidor()`.
 */
export const NOME_COOKIE_SESSAO = 'sb-periodiza-auth-token'

/**
 * Schema deste projeto no Postgres.
 *
 * Regra geral desta instalacao: uma unica instancia do Supabase hospeda varios
 * projetos, e o isolamento acontece em duas camadas.
 *
 *   camada 1 — entre projetos : schema proprio (esta constante + migration 0012)
 *   camada 2 — entre usuarios : RLS dentro do schema (migration 0011)
 *
 * Sem a camada 1 dois projetos colidem no `public`: `clients`, `sessions`,
 * `equipment` e `profiles` sao nomes que qualquer sistema usa.
 *
 * Precisa bater com o schema da migration 0012 e estar em `PGRST_DB_SCHEMAS`
 * na stack do Supabase, senao a API responde 404 em tudo.
 */
export const SCHEMA_DO_PROJETO =
  process.env.NEXT_PUBLIC_SUPABASE_SCHEMA ?? 'periodiza'

const esquemaPublico = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url('NEXT_PUBLIC_SUPABASE_URL precisa ser uma URL valida, com https:// ou http://.'),
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

/**
 * URL do Supabase que o **servidor** deve usar.
 *
 * `SUPABASE_INTERNAL_URL` e opcional e existe para Supabase auto-hospedado no
 * mesmo host que a aplicacao. Quando definida, o codigo de servidor fala com o
 * gateway pela rede interna do Docker (`http://supabase-kong:8000`), enquanto o
 * browser continua usando `NEXT_PUBLIC_SUPABASE_URL`. Ganhos concretos:
 *
 *   - o servidor nao depende de DNS publico nem do proxy reverso para
 *     funcionar — o app sobe mesmo antes de o dominio publico estar pronto;
 *   - certificado autoassinado no dominio publico deixa de derrubar as chamadas
 *     de servidor, porque elas nem passam por TLS;
 *   - uma volta a menos pela internet em toda renderizacao.
 *
 * Diferente das `NEXT_PUBLIC_*`, esta variavel e lida em **runtime** — pode ser
 * ajustada no painel sem rebuildar a imagem. Se estiver ausente ou invalida,
 * cai na URL publica, que e o comportamento de sempre.
 *
 * O split so e seguro porque `NOME_COOKIE_SESSAO` fixa o nome do cookie; sem
 * isso os dois lados procurariam cookies com nomes diferentes.
 */
export function urlSupabaseServidor(): string {
  const publica = envPublico().NEXT_PUBLIC_SUPABASE_URL
  const interna = process.env.SUPABASE_INTERNAL_URL

  if (!interna) return publica

  try {
    new URL(interna)
    return interna
  } catch {
    console.error(
      `SUPABASE_INTERNAL_URL invalida (${interna}). Confira se o esquema ` +
        '(http:// ou https://) esta presente. Usando NEXT_PUBLIC_SUPABASE_URL.',
    )
    return publica
  }
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
