'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { Logo } from '@/components/logo'
import { SelectorIdioma } from '@/components/selector-idioma'
import { ThemeToggle } from '@/components/theme-toggle'
import { traducciones } from '@/lib/idioma'
import { useTextos } from '@/lib/use-idioma'
import { cn } from '@/lib/utils'

const TEXTOS = traducciones({
  es: {
    links: [
      { href: '#como-funciona', label: 'Cómo funciona' },
      { href: '#extension', label: 'Extensión' },
      { href: '#boreal-data', label: 'Boreal Data' },
      { href: '#faq', label: 'Preguntas' },
    ],
    inicio: 'AletheIA — inicio',
    entrar: 'Entrar',
    abrirMenu: 'Abrir menú',
    cerrarMenu: 'Cerrar menú',
    modoLectura: 'Modo de lectura',
    idioma: 'Idioma',
  },
  en: {
    links: [
      { href: '#como-funciona', label: 'How it works' },
      { href: '#extension', label: 'Extension' },
      { href: '#boreal-data', label: 'Boreal Data' },
      { href: '#faq', label: 'FAQ' },
    ],
    inicio: 'AletheIA — home',
    entrar: 'Log in',
    abrirMenu: 'Open menu',
    cerrarMenu: 'Close menu',
    modoLectura: 'Reading mode',
    idioma: 'Language',
  },
})

export function Navbar() {
  const [menuAbierto, setMenuAbierto] = useState(false)
  const t = useTextos(TEXTOS)

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-bg/80 backdrop-blur-xl">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent"
      />
      {/* A ancho completo, no dentro del shell: el logo y el botón viven en los
          extremos de la pantalla, no a 400px del borde en un monitor grande. */}
      <nav className="flex items-center justify-between gap-3 px-gutter py-4 md:px-8 xl:px-12">
        <a href="#" aria-label={t.inicio} className="min-w-0 shrink-0">
          <Logo showParent />
        </a>

        {/* `flex-1 justify-center`: los enlaces quedan centrados en la pantalla,
            no pegados al logo, ahora que la barra ocupa todo el ancho. */}
        <div className="hidden flex-1 items-center justify-center gap-7 lg:flex">
          {t.links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="relative whitespace-nowrap text-body-sm text-muted transition-colors duration-150 ease-boreal hover:text-ink after:absolute after:-bottom-1.5 after:left-0 after:h-px after:w-0 after:bg-accent-text after:transition-all after:duration-300 hover:after:w-full"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {/* El idioma va en la barra y no escondido en un menú: quien llega sin
              leer español tiene que poder encontrarlo sin leer español. En el
              celular no entra al lado del logo, así que baja al menú. */}
          <SelectorIdioma className="hidden sm:inline-flex" />
          <ThemeToggle className="hidden sm:inline-flex" />
          <Link href="/login" className="btn-primary whitespace-nowrap" style={{ padding: '10px 18px' }}>
            {t.entrar}
          </Link>

          <button
            type="button"
            onClick={() => setMenuAbierto((v) => !v)}
            aria-label={menuAbierto ? t.cerrarMenu : t.abrirMenu}
            aria-expanded={menuAbierto}
            className="flex size-10 shrink-0 items-center justify-center rounded-pill text-subtle transition-colors duration-150 ease-boreal hover:bg-surface hover:text-ink lg:hidden"
          >
            {menuAbierto ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
        </div>
      </nav>

      {menuAbierto && (
        <div className={cn('animate-rise border-t border-border bg-bg px-gutter py-4 lg:hidden md:px-8')}>
          <div className="flex flex-col gap-1">
            {t.links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMenuAbierto(false)}
                className="rounded-lg px-3 py-3 text-body-sm font-medium text-muted transition-colors duration-150 ease-boreal hover:bg-surface hover:text-ink"
              >
                {link.label}
              </a>
            ))}
            <div className="mt-2 flex flex-col gap-3 border-t border-border px-3 pt-4 sm:hidden">
              <div className="flex items-center gap-3">
                <SelectorIdioma />
                <span className="font-mono text-micro uppercase text-disabled">{t.idioma}</span>
              </div>
              <div className="flex items-center gap-3">
                <ThemeToggle />
                <span className="font-mono text-micro uppercase text-disabled">{t.modoLectura}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
