import { Dumbbell } from 'lucide-react'

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col">
      <header className="border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex h-14 items-center px-4 max-w-md mx-auto w-full gap-2">
          <Dumbbell className="h-5 w-5 text-amber-500" />
          <span className="font-bold text-lg tracking-tight">Periodiza</span>
        </div>
      </header>
      
      <main className="flex-1 flex flex-col max-w-md mx-auto w-full relative">
        {children}
      </main>
    </div>
  )
}
