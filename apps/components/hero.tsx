import { Sparkles } from 'lucide-react'
import { AnalisisInput } from '@/components/analisis-input'

export function Hero() {
  return (
    <section className="relative overflow-hidden px-6 pt-20 pb-24">
      {/* subtle radial glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 mx-auto h-[500px] w-[900px] max-w-full rounded-full opacity-25 blur-3xl"
        style={{
          background:
            'radial-gradient(circle at center, #1a6db5 0%, transparent 65%)',
        }}
      />

      <div className="mx-auto max-w-3xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-blue/40 bg-blue/10 px-4 py-1.5 text-sm font-medium text-blue-light">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          Detector de noticias falsas con IA
        </span>

        <h1 className="mt-8 text-balance font-serif text-5xl font-bold leading-tight tracking-tight text-ice sm:text-6xl">
          ¿Es esta noticia <span className="text-blue-light">verdadera</span>?
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
          Pegá una URL o texto y AletheIA analiza la fuente, verifica los datos y
          te explica por qué es confiable o no.
        </p>
      </div>

      <div className="mt-12">
        <AnalisisInput />
      </div>
    </section>
  )
}