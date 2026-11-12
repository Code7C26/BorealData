'use client'

import Link from 'next/link'
import { Logo } from '@/components/logo'
import { LogoBorealData } from '@/components/logo-boreal'
import { traducciones } from '@/lib/idioma'
import { cn } from '@/lib/utils'
import { useTextos } from '@/lib/use-idioma'

const TEXTOS = traducciones({
  es: {
    links: [
      { href: '/contacto', label: 'Contacto' },
      { href: '#faq', label: 'Preguntas' },
      { href: '#boreal-data', label: 'Quiénes somos' },
      { href: '/privacidad', label: 'Privacidad' },
      { href: '/terminos', label: 'Términos' },
    ],
    bajada: 'Verificación que se deja auditar. No un puntaje: el camino completo hasta el veredicto.',
    enlaces: 'Enlaces del pie',
  },
  en: {
    links: [
      { href: '/contacto', label: 'Contact' },
      { href: '#faq', label: 'FAQ' },
      { href: '#boreal-data', label: 'About us' },
      { href: '/privacidad', label: 'Privacy' },
      { href: '/terminos', label: 'Terms' },
    ],
    bajada: 'Fact-checking you can audit. Not a score: the full path to the verdict.',
    enlaces: 'Footer links',
  },
})

export function Footer() {
  const t = useTextos(TEXTOS)

  return (
    <footer className="relative border-t border-border bg-bg px-gutter py-6 md:px-8 md:py-12 xl:px-12">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent"
      />
      {/* Mismo criterio que el encabezado: el pie ocupa el ancho de la página. */}
      <div className="flex flex-col gap-4 md:gap-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="hidden flex-col gap-3 md:flex">
            <Logo />
            <p className="max-w-texto text-caption tracking-normal text-subtle">{t.bajada}</p>
          </div>

          <nav className="flex flex-wrap gap-x-4 gap-y-1.5 md:gap-x-6 md:gap-y-2" aria-label={t.enlaces}>
            {t.links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  link.href === '#faq' && 'max-md:hidden',
                  'font-mono text-[0.625rem] uppercase text-subtle transition-colors md:text-micro duration-150 ease-boreal hover:text-accent-text',
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* El producto firma arriba; abajo firma la casa. */}
        <div className="flex flex-row items-center justify-between gap-4 border-t border-border pt-4 md:pt-6">
          {/* Sin bajada: a este cuerpo el mono queda por debajo de lo legible,
              y la plantilla prevé la reducción a solo la palabra. */}
          <LogoBorealData bajada={false} className="text-[1rem] md:text-[1.5rem]" />
          <p className="font-mono text-[0.625rem] uppercase text-disabled md:text-micro">© 2026 Boreal Data</p>
        </div>
      </div>
    </footer>
  )
}
