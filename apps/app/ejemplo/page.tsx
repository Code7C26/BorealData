import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Search } from 'lucide-react'
import { Aurora } from '@/components/aurora'
import { Logo } from '@/components/logo'
import { ThemeToggle } from '@/components/theme-toggle'
import { ResultCard } from '@/components/result/result-card'
import { ANALISIS_EJEMPLO, FECHA_EJEMPLO } from '@/lib/ejemplo'

export const metadata: Metadata = {
  title: 'Un análisis de ejemplo — AletheIA',
  description:
    'Así se lee un resultado de AletheIA: veredicto, nivel de confianza, las fuentes con su postura y los pasos del razonamiento.',
}

/**
 * "Probar un ejemplo" — pública, sin sesión.
 *
 * Vive fuera de (autenticado) a propósito: el ejemplo es la forma más rápida de
 * explicar el producto sin copy, y mandarlo al login lo vuelve inútil
 * justamente para quien todavía no tiene cuenta. Como el análisis está
 * precargado, no gasta una llamada real a Gemini ni necesita backend.
 */
export default function EjemploPage() {
  return (
    <main className="relative isolate min-h-screen overflow-hidden">
      <Aurora intensity="soft" />

      <div className="mx-auto flex w-full max-w-card flex-col gap-8 px-gutter py-8 md:px-6 md:py-12">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" aria-label="AletheIA — inicio">
            <Logo />
          </Link>
          <ThemeToggle />
        </div>

        <header className="flex flex-col gap-3">
          <p className="eyebrow">Un análisis de ejemplo</p>
          <h1 className="font-display text-h2-fluid text-display">Así se lee un resultado</h1>
          <p className="max-w-texto text-muted">
            Es una verificación real, precargada. Mirá el orden: qué pasó, cuánta certeza, dónde
            miramos y cómo lo pensamos. Las fuentes van con su postura, incluso la que originó la
            cadena.
          </p>
        </header>

        <ResultCard analysis={ANALISIS_EJEMPLO} fecha={FECHA_EJEMPLO} showActions={false} />

        <section className="panel flex flex-col gap-4">
          <h2 className="font-mono text-caption uppercase text-subtle">De qué trata la nota</h2>
          <p className="text-body-sm text-muted">{ANALISIS_EJEMPLO.summary}</p>
          <p className="border-t border-border pt-4 font-display text-body-sm font-semibold text-display">
            {ANALISIS_EJEMPLO.title}
          </p>
        </section>

        <div className="flex flex-col gap-3 md:flex-row">
          <Link href="/registro" className="btn-primary w-full md:w-auto">
            <Search aria-hidden="true" size={16} />
            Verificar una nota tuya
          </Link>
          <Link href="/" className="btn-secondary w-full md:w-auto">
            <ArrowLeft aria-hidden="true" size={16} />
            Volver al inicio
          </Link>
        </div>
      </div>
    </main>
  )
}
