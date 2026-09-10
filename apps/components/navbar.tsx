'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'

const NAV_LINKS = [
  { href: '#como-funciona', label: 'Cómo funciona' },
  { href: '#acerca-de', label: 'Acerca de' },
]

export function Navbar() {
  const [menuAbierto, setMenuAbierto] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-navy/80 backdrop-blur-md">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-blue-light/60 to-transparent"
      />
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <a href="#" aria-label="Boreal Data — inicio" className="group min-w-0 shrink-0">
          <div className="flex items-center gap-3">
            <img
              src="/logoAletheia.png"
              alt="AletheIA"
              className="h-9 shrink-0 object-contain transition-transform duration-300 group-hover:scale-110 sm:h-10"
            />
            <div className="hidden flex-col leading-tight sm:flex">
              <span className="text-ice font-bold text-sm tracking-widest uppercase">
                Boreal Data
              </span>
              <span className="text-blue-light text-xs tracking-wider">
                by AletheIA
              </span>
            </div>
          </div>
        </a>

        <div className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="relative text-sm font-medium text-muted-foreground transition-colors hover:text-ice after:absolute after:-bottom-1 after:left-0 after:h-px after:w-0 after:bg-blue-light after:transition-all after:duration-300 hover:after:w-full"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/login"
            className="btn-primary whitespace-nowrap px-3.5 py-2 sm:px-5"
          >
            Iniciar sesión
          </Link>

          <button
            type="button"
            onClick={() => setMenuAbierto((v) => !v)}
            aria-label={menuAbierto ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={menuAbierto}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-ice md:hidden"
          >
            {menuAbierto ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {menuAbierto && (
        <div className="border-t border-border/60 bg-navy px-6 py-4 md:hidden animate-fade-up">
          <div className="mx-auto flex max-w-6xl flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMenuAbierto(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-ice"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </header>
  )
}
