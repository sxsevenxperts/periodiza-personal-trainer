'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { criarClienteServidor } from '@/lib/supabase/server'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
})

type LoginState = {
  error: string | null
}

export async function login(prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const parsed = loginSchema.safeParse({ email, password })
  if (!parsed.success) {
    return {
      error: parsed.error.errors[0]?.message || 'Validação falhou',
    }
  }

  const supabase = await criarClienteServidor()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return {
      error: error.message.includes('Invalid login credentials') 
        ? 'E-mail ou senha incorretos' 
        : 'Erro ao fazer login. Tente novamente.',
    }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}
