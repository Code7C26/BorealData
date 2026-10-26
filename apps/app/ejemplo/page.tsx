import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Search } from 'lucide-react'
import { Aurora } from '@/components/aurora'
import { Logo } from '@/components/logo'
import { SelectorIdioma } from '@/components/selector-idioma'
import { ThemeToggle } from '@/components/theme-toggle'
import { ResultCard } from '@/components/result/result-card'
import { ANALISIS_EJEMPLO, FECHA_EJEMPLO } from '@/lib/ejemplo'
import { traducciones } from '@/lib/idioma'
import { leerIdioma } from '@/lib/idioma-servidor'

const TEXTOS = traducciones({
  es: {
    metadata: {
      title: 'Un análisis de ejemplo — AletheIA',
      description:
        'Así se lee un resultado de AletheIA: veredicto, nivel de confianza, las fuentes con su postura y los pasos del razonamiento.',
    },
    inicio: 'AletheIA — inicio',
    eyebrow: 'Un análisis de ejemplo',
    titulo: 'Así se lee un resultado',
    bajada:
      'Es una verificación real, precargada. Mirá el orden: qué pasó, cuánta certeza, dónde miramos y cómo lo pensamos. Las fuentes van con su postura, incluso la que originó la cadena.',
    deQueTrata: 'De qué trata la nota',
    verificar: 'Verificar una nota tuya',
    volver: 'Volver al inicio',
  },
  en: {
    metadata: {
      title: 'A sample analysis — AletheIA',
      description:
        'How to read an AletheIA result: verdict, confidence level, the sources with where each one stands and the steps of the reasoning.',
    },
    inicio: 'AletheIA — home',
    eyebrow: 'A sample analysis',
    titulo: 'How to read a result',
    bajada:
      'This is a real, preloaded check. Look at the order: what happened, how certain we are, where we looked and how we thought it through. The sources come with where they stand, even the one that started the chain.',
    deQueTrata: 'What the article is about',
    verificar: 'Check an article of your own',
    volver: 'Back to home',
  },
})

export async function generateMetadata(): Promise<Metadata> {
  return TEXTOS[await leerIdioma()].metadata
}

/**
 * "Probar un ejemplo" — pública, sin sesión.
 *
 * Vive fuera de (autenticado) a propósito: el ejemplo es la forma más rápida de
 * explicar el producto sin copy, y mandarlo al login lo vuelve inútil
 * justamente para quien todavía no tiene cuenta. Como el análisis está
 * precargado, no gasta una llamada real a Gemini ni necesita backend.
 */
export default async function EjemploPage() {
  const idioma = await leerIdioma()
  const t = TEXTOS[idioma]
  const analisis = ANALISIS_EJEMPLO[idioma]

  return (
    <main className="relative isolate min-h-screen overflow-hidden">
      <Aurora intensity="soft" />

      <div className="mx-auto flex w-full max-w-card flex-col gap-8 px-gutter py-8 md:px-6 md:py-12">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" aria-label={t.inicio}>
            <Logo />
          </Link>
          <div className="flex items-center gap-2">
            <SelectorIdioma />
            <ThemeToggle />
          </div>
        </div>

        <header className="flex flex-col gap-3">
          <p className="eyebrow">{t.eyebrow}</p>
          <h1 className="font-display text-h2-fluid text-display">{t.titulo}</h1>
          <p className="max-w-texto text-muted">{t.bajada}</p>
        </header>

        <ResultCard analysis={analisis} fecha={FECHA_EJEMPLO} showActions={false} />

        <section className="panel flex flex-col gap-4">
          <h2 className="font-mono text-caption uppercase text-subtle">{t.deQueTrata}</h2>
          <p className="text-body-sm text-muted">{analisis.summary}</p>
          <p className="border-t border-border pt-4 font-display text-body-sm font-semibold text-display">
            {analisis.title}
          </p>
        </section>

        <div className="flex flex-col gap-3 md:flex-row">
          <Link href="/registro" className="btn-primary w-full md:w-auto">
            <Search aria-hidden="true" size={16} />
            {t.verificar}
          </Link>
          <Link href="/" className="btn-secondary w-full md:w-auto">
            <ArrowLeft aria-hidden="true" size={16} />
            {t.volver}
          </Link>
        </div>
      </div>
    </main>
  )
}
