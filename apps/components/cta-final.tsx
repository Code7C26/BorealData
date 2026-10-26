'use client'

import Link from 'next/link'
import { Search } from 'lucide-react'
import { Aurora } from '@/components/aurora'
import { traducciones } from '@/lib/idioma'
import { useTextos } from '@/lib/use-idioma'

const TEXTOS = traducciones({
  es: {
    titulo: 'La próxima que te llegue por WhatsApp,',
    destacado: 'mirá primero de dónde sale',
    bajada: 'Gratis, en segundos, y con las fuentes a la vista para que decidas vos.',
    verificar: 'Verificar una nota',
    yaTengoCuenta: 'Ya tengo cuenta',
  },
  en: {
    titulo: 'Next time something lands on your WhatsApp,',
    destacado: 'check where it comes from first',
    bajada: 'Free, in seconds, with the sources in plain sight so you can decide for yourself.',
    verificar: 'Check an article',
    yaTengoCuenta: 'I already have an account',
  },
})

export function CtaFinal() {
  const t = useTextos(TEXTOS)

  return (
    <section className="relative isolate overflow-hidden px-gutter py-40 md:px-6">
      {/* Fundido arriba y abajo: sin esto la sección arranca con un corte duro
          contra la anterior. */}
      <div aria-hidden="true" className="fundido-vertical pointer-events-none absolute inset-0 -z-10 isolate">
        <Aurora />
        <div className="noise-field" />
      </div>

      <div className="relative mx-auto max-w-3xl text-center">
        <h2 className="text-balance font-display text-[clamp(2.25rem,5vw,3.75rem)] leading-[1.06] font-bold tracking-[-0.03em] text-display">
          {t.titulo} <span className="text-aurora">{t.destacado}</span>.
        </h2>
        <p className="mx-auto mt-7 max-w-texto text-pretty text-muted">{t.bajada}</p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link href="/registro" className="btn-primary">
            <Search aria-hidden="true" size={16} />
            {t.verificar}
          </Link>
          <Link href="/login" className="btn-secondary">
            {t.yaTengoCuenta}
          </Link>
        </div>
      </div>
    </section>
  )
}
