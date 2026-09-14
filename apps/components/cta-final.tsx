import Link from 'next/link'
import { Search } from 'lucide-react'
import { Aurora } from '@/components/aurora'

export function CtaFinal() {
  return (
    <section className="relative isolate overflow-hidden px-gutter py-40 md:px-6">
      <Aurora intensity="loud" />
      <div aria-hidden="true" className="noise-field" />

      <div className="relative mx-auto max-w-3xl text-center">
        <h2 className="text-balance font-display text-[clamp(2.25rem,5vw,3.75rem)] leading-[1.06] font-bold tracking-[-0.03em] text-display">
          La próxima que te llegue por WhatsApp,{' '}
          <span className="text-aurora">mirá primero de dónde sale</span>.
        </h2>
        <p className="mx-auto mt-7 max-w-texto text-pretty text-muted">
          Gratis, en segundos, y con las fuentes a la vista para que decidas vos.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link href="/registro" className="btn-primary">
            <Search aria-hidden="true" size={16} />
            Verificar una nota
          </Link>
          <Link href="/login" className="btn-secondary">
            Ya tengo cuenta
          </Link>
        </div>
      </div>
    </section>
  )
}
