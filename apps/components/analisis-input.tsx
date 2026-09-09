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
    <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-2xl shadow-navy/60">
      <div className="flex gap-2 rounded-lg bg-navy p-1">
        <button
          onClick={() => {
            setMode('url')
            setValue('')
          }}
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
          onClick={() => {
            setMode('texto')
            setValue('')
          }}
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
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-blue py-3.5 text-base font-semibold text-ice shadow-lg shadow-blue/30 transition-all hover:bg-blue-light hover:text-navy hover:shadow-blue-light/40 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-blue disabled:hover:text-ice disabled:hover:shadow-blue/30"
      >
        <Search className="h-5 w-5" aria-hidden="true" />
        Analizar con AletheIA
      </button>
    </div>
  )
}
