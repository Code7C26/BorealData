'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { Logo } from '@/components/logo'
import { ThemeToggle } from '@/components/theme-toggle'
import { cn } from '@/lib/utils'

const NAV_LINKS = [
  { href: '#como-funciona', label: 'Cómo funciona' },
  { href: '#extension', label: 'Extensión' },
  { href: '#boreal-data', label: 'Boreal Data' },
  { href: '#faq', label: 'Preguntas' },
]

export function Navbar() {
  const [menuAbierto, setMenuAbierto] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-bg/80 backdrop-blur-xl">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent"
      />
      <nav className="mx-auto flex max-w-shell items-center justify-between gap-3 px-gutter py-4 md:px-6">
        <a href="#" aria-label="AletheIA — inicio" className="min-w-0 shrink-0">
          <Logo />
        </a>

        <div className="hidden items-center gap-7 lg:flex">
          {NAV_LINKS.map((link) => (
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
          <ThemeToggle className="hidden sm:inline-flex" />
          <Link href="/login" className="btn-primary whitespace-nowrap" style={{ padding: '10px 18px' }}>
            Entrar
          </Link>

          <button
            type="button"
            onClick={() => setMenuAbierto((v) => !v)}
            aria-label={menuAbierto ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={menuAbierto}
            className="flex size-10 shrink-0 items-center justify-center rounded-pill text-subtle transition-colors duration-150 ease-boreal hover:bg-surface hover:text-ink lg:hidden"
          >
            {menuAbierto ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
        </div>
      </nav>

      {menuAbierto && (
        <div className={cn('animate-rise border-t border-border bg-bg px-gutter py-4 lg:hidden md:px-6')}>
          <div className="mx-auto flex max-w-shell flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMenuAbierto(false)}
                className="rounded-lg px-3 py-3 text-body-sm font-medium text-muted transition-colors duration-150 ease-boreal hover:bg-surface hover:text-ink"
              >
                {link.label}
              </a>
            ))}
            <div className="mt-2 flex items-center gap-3 border-t border-border px-3 pt-4 sm:hidden">
              <ThemeToggle />
              <span className="font-mono text-micro uppercase text-disabled">Modo de lectura</span>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
