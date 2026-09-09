'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Link2, FileText } from 'lucide-react'

export function AnalisisInput() {
  const router = useRouter()
  const [mode, setMode] = useState<'url' | 'texto'>('url')
  const [value, setValue] = useState('')

  const handleAnalyze = () => {
    if (mode !== 'url' || !value.trim()) return
    router.push(`/analizando?tipo=${mode}&valor=${encodeURIComponent(value.trim())}`)
  }

  return (
    <div
      className="mx-auto max-w-2xl rounded-2xl border border-border/80 bg-card p-6"
      style={{
        boxShadow:
          '0 30px 80px -25px rgba(2, 8, 15, 0.75), 0 0 100px -30px rgba(26, 109, 181, 0.6)',
      }}
    >
      <div className="relative flex rounded-lg bg-navy p-1">
        <div
          aria-hidden="true"
          className={`absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-md bg-gradient-to-r from-blue-light to-blue shadow-lg shadow-blue/30 transition-transform duration-300 ease-out ${
            mode === 'texto' ? 'translate-x-full' : 'translate-x-0'
          }`}
        />
        <button
          onClick={() => {
            setMode('url')
            setValue('')
          }}
          className={`relative z-10 flex flex-1 items-center justify-center gap-2 rounded-md py-2 text-sm font-semibold transition-colors duration-300 ${
            mode === 'url' ? 'text-ice' : 'text-muted-foreground hover:text-ice'
          }`}
          aria-pressed={mode === 'url'}
        >
          <Link2 className="h-4 w-4" aria-hidden="true" />
          URL
        </button>
        <button
          onClick={() => {
            setMode('texto')
            setValue('')
          }}
          className={`relative z-10 flex flex-1 items-center justify-center gap-2 rounded-md py-2 text-sm font-semibold transition-colors duration-300 ${
            mode === 'texto' ? 'text-ice' : 'text-muted-foreground hover:text-ice'
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
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="https://www.ejemplo.com/noticia..."
            className="w-full rounded-lg border border-border bg-navy px-4 py-3 text-ice placeholder:text-muted-foreground/70 focus:border-blue-light focus:outline-none focus:ring-2 focus:ring-blue-light/40"
            aria-label="URL de la noticia"
          />
        ) : (
          <>
            <p className="mb-2 text-sm text-amber-300/90">
              Disponible próximamente — por ahora AletheIA solo analiza URLs.
            </p>
            <textarea
              rows={4}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Pegá aquí el texto de la noticia que querés verificar..."
              disabled
              className="w-full resize-none cursor-not-allowed rounded-lg border border-border bg-navy px-4 py-3 text-ice/60 placeholder:text-muted-foreground/70 focus:outline-none"
              aria-label="Texto de la noticia"
            />
          </>
        )}
      </div>

      <button
        onClick={handleAnalyze}
        disabled={mode !== 'url' || !value.trim()}
        className="btn-primary mt-4 w-full py-3.5 text-base"
      >
        <Search className="h-5 w-5" aria-hidden="true" />
        Analizar con AletheIA
      </button>
    </div>
  )
}
