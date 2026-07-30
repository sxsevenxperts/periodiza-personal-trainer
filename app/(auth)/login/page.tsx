import type { Metadata } from 'next'
import Image from 'next/image'
import { LoginForm } from './login-form'

export const metadata: Metadata = {
  title: 'Entrar | Periodiza',
  description: 'Faça login para acessar o Periodiza.',
}

export default function PaginaLogin() {
  return (
    <div className="flex min-h-dvh w-full bg-zinc-950 text-zinc-50">
      {/* Left side: Form */}
      <div className="flex w-full flex-col justify-center px-6 py-12 md:w-1/2 lg:w-1/3 xl:w-[450px] mx-auto md:mx-0 lg:px-12 xl:px-16 shadow-2xl z-10 bg-zinc-950">
        <div className="mx-auto w-full max-w-sm flex-col gap-6 flex">
          <div className="flex flex-col gap-2 text-center md:text-left">
            <h1 className="text-3xl font-bold tracking-tight text-amber-500">Periodiza</h1>
            <p className="text-sm text-zinc-400">
              Acesse sua conta para gerenciar alunos e periodizações.
            </p>
          </div>
          <LoginForm />
          <p className="text-center text-sm text-zinc-500">
            Dúvidas? <a href="#" className="text-amber-500 hover:underline">Fale com o suporte</a>
          </p>
        </div>
      </div>

      {/* Right side: Image Cover */}
      <div className="hidden md:flex flex-1 relative bg-zinc-900 border-l border-zinc-800/50">
        <Image
          src="/dr-luiz.png"
          alt="Doutor Luiz C. Júnior"
          fill
          className="object-cover object-center opacity-90 saturate-50 mix-blend-luminosity"
          priority
          sizes="(max-width: 768px) 0px, 100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-transparent to-transparent opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent" />
        
        {/* Optional Branding overlay */}
        <div className="absolute bottom-12 left-12 right-12 z-20">
          <blockquote className="space-y-2">
            <p className="text-lg font-medium text-zinc-300 italic">
              &quot;A excelência na periodização transforma esforço em resultado garantido.&quot;
            </p>
            <footer className="text-sm text-amber-500 font-semibold">Dr. Luiz C. Júnior</footer>
          </blockquote>
        </div>
      </div>
    </div>
  )
}
