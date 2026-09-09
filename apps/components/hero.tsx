import { Sparkles } from 'lucide-react'
import { AnalisisInput } from '@/components/analisis-input'

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden px-6 pt-24 pb-28">
      {/* grid técnico de fondo */}
      <div
        aria-hidden="true"
        className="grid-overlay pointer-events-none absolute inset-0 -z-20"
      />

      {/* blobs animados */}
      <div
        aria-hidden="true"
        className="glow-blob animate-float -top-24 left-[8%] h-72 w-72 -z-10 bg-blue/30 sm:h-96 sm:w-96"
      />
      <div
        aria-hidden="true"
        className="glow-blob animate-float-delayed top-10 right-[8%] h-64 w-64 -z-10 bg-blue-light/20 sm:h-80 sm:w-80"
      />

      <div className="mx-auto max-w-3xl text-center animate-fade-up">
        <span className="eyebrow-badge">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-light opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-light" />
          </span>
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          Detector de noticias falsas con IA
        </span>

        <h1 className="mt-8 text-balance font-serif text-5xl font-bold leading-[1.1] tracking-tight text-ice sm:text-6xl md:text-7xl">
          ¿Es esta noticia{' '}
          <span className="text-gradient animate-pulse-slow">verdadera</span>?
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
          Pegá una URL o texto y AletheIA analiza la fuente, verifica los datos y
          te explica por qué es confiable o no.
        </p>
      </div>

      <div className="relative mt-14 animate-fade-up" style={{ animationDelay: '120ms' }}>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-6 -inset-y-4 -z-10 rounded-[2rem] bg-gradient-to-br from-blue/40 via-blue-light/15 to-transparent opacity-60 blur-2xl sm:inset-x-10"
        />
        <AnalisisInput />
      </div>
    </section>
  )
}
