'use client'

import { useActionState, useEffect, useState } from 'react'
import { login } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const initialState = {
  error: null as string | null,
}

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(login, initialState)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    // If the server action successfully redirected, this component might unmount. 
    // If there's an error, it will appear in state.error.
  }, [state])

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state.error && (
        <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
          {state.error}
        </div>
      )}
      <div className="grid gap-2">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="seu@email.com.br"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          autoFocus
        />
      </div>
      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Senha</Label>
          <a href="#" className="text-sm font-medium text-primary hover:underline underline-offset-4">
            Esqueceu a senha?
          </a>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
      </div>
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? 'Entrando...' : 'Entrar'}
      </Button>
    </form>
  )
}
