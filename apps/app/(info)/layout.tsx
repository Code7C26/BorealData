'use client'

import Link from 'next/link'
import { Aurora } from '@/components/aurora'
import { Logo } from '@/components/logo'
import { Sidebar } from '@/components/sidebar'
import { ThemeToggle } from '@/components/theme-toggle'
import { useAuth } from '@/lib/auth-context'

/**
 * Marco de las páginas de información: contacto, privacidad y términos.
 *
 * Son las tres públicas —a quien quiere escribirnos o leer qué hacemos con sus
 * datos todavía no le pedimos cuenta— pero también están en el sidebar y en el
 * pie de la app, así que las mira gente de los dos lados. Por eso el marco es
 * mixto: con sesión, el sidebar de siempre; sin sesión, el encabezado público.
 *
 * Durante `loading` se asume visitante en vez de esperar: la resolución de auth
 * es client-only y bloquear el render dejaría a un visitante mirando una
 * pantalla vacía en páginas que son, justamente, las que tiene que poder leer
 * sin cuenta. Para alguien con sesión eso significa que el sidebar aparece un
 * instante después, no que la página cambie de contenido.
 */
/**
 * El contenedor del contenido, UNO SOLO para las dos ramas.
 *
 * Que sea una constante compartida y no dos clases escritas aparte es el punto: la rama
 * con sidebar pasaba `{children}` crudo y el texto quedaba pegado al borde del sidebar,
 * cortado, porque el `px-gutter` solo existía en la rama pública. Mientras las dos ramas
 * usen esta constante, el contenido se enmarca igual con sesión y sin ella.
 *
 * Los valores son los mismos que usan las demás páginas autenticadas (ver
 * historial/page.tsx): mismo ancho máximo, mismo gutter y mismo aire vertical.
 */
const CONTENEDOR =
  'mx-auto flex w-full max-w-card flex-col gap-8 px-gutter py-12 md:px-6 md:py-16'

export default function LayoutInfo({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()

  if (user) {
    return (
      <Sidebar>
        <div className={CONTENEDOR}>{children}</div>
      </Sidebar>
    )
  }

  return (
    <main className="relative isolate min-h-screen overflow-hidden">
      <Aurora intensity="soft" />

      <div className={CONTENEDOR}>
        <div className="flex items-center justify-between gap-4">
          <Link href="/" aria-label="AletheIA — inicio">
            <Logo showParent />
          </Link>
          <ThemeToggle />
        </div>

        {children}

        <footer className="flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
          <nav className="flex flex-wrap gap-x-6 gap-y-2" aria-label="Enlaces de información">
            <Link href="/" className="font-mono text-micro uppercase text-subtle hover:text-accent-text">
              Inicio
            </Link>
            <Link href="/privacidad" className="font-mono text-micro uppercase text-subtle hover:text-accent-text">
              Privacidad
            </Link>
            <Link href="/terminos" className="font-mono text-micro uppercase text-subtle hover:text-accent-text">
              Términos
            </Link>
            <Link href="/contacto" className="font-mono text-micro uppercase text-subtle hover:text-accent-text">
              Contacto
            </Link>
          </nav>
          <p className="font-mono text-micro uppercase text-disabled">© 2026 Boreal Data</p>
        </footer>
      </div>
    </main>
  )
}
