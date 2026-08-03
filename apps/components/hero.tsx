'use client'

import { useState } from 'react'
import { Search, Sparkles, Link2, FileText } from 'lucide-react'

export function Hero() {
  const [mode, setMode] = useState<'url' | 'texto'>('url')

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

      {/* Input card */}
      <div className="mx-auto mt-12 max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-2xl shadow-navy/60">
        <div className="flex gap-2 rounded-lg bg-navy p-1">
          <button
            onClick={() => setMode('url')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md py-2 text-sm font-semibold transition-all ${
              mode === 'url'
                ? 'bg-blue text-ice shadow'
                : 'text-muted-foreground hover:text-ice'
            }`}
            aria-pressed={mode === 'url'}
          >
            <Link2 className="h-4 w-4" aria-hidden="true" />
            URL
          </button>
          <button
            onClick={() => setMode('texto')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md py-2 text-sm font-semibold transition-all ${
              mode === 'texto'
                ? 'bg-blue text-ice shadow'
                : 'text-muted-foreground hover:text-ice'
            }`}
            aria-pressed={mode === 'texto'}
          >
            <FileText className="h-4 w-4" aria-hidden="true" />
            Texto
          </button>
        </div>

        <div className="mt-4">
          {mode === 'url' ? (
            <input
              type="url"
              placeholder="https://www.ejemplo.com/noticia..."
              className="w-full rounded-lg border border-border bg-navy px-4 py-3 text-ice placeholder:text-muted-foreground/70 focus:border-blue-light focus:outline-none focus:ring-2 focus:ring-blue-light/40"
              aria-label="URL de la noticia"
            />
          ) : (
            <textarea
              rows={4}
              placeholder="Pegá aquí el texto de la noticia que querés verificar..."
              className="w-full resize-none rounded-lg border border-border bg-navy px-4 py-3 text-ice placeholder:text-muted-foreground/70 focus:border-blue-light focus:outline-none focus:ring-2 focus:ring-blue-light/40"
              aria-label="Texto de la noticia"
            />
          )}
        </div>

        <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-blue py-3.5 text-base font-semibold text-ice shadow-lg shadow-blue/30 transition-all hover:bg-blue-light hover:text-navy hover:shadow-blue-light/40">
          <Search className="h-5 w-5" aria-hidden="true" />
          Analizar con AletheIA
        </button>
      </div>
    </section>
  )
}
