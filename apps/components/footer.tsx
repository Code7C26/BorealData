import Link from 'next/link'
import { Logo } from '@/components/logo'

const LINKS = [
  { href: '/contacto', label: 'Contacto' },
  { href: '#faq', label: 'Preguntas' },
  { href: '#boreal-data', label: 'Quiénes somos' },
]

export function Footer() {
  return (
    <footer className="relative border-t border-border bg-bg px-gutter py-12 md:px-6">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent"
      />
      <div className="mx-auto flex max-w-shell flex-col gap-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-3">
            <Logo showParent />
            <p className="max-w-texto text-caption tracking-normal text-subtle">
              Verificación que se deja auditar. No un puntaje: el camino completo hasta el
              veredicto.
            </p>
          </div>

          <nav className="flex flex-wrap gap-x-6 gap-y-2" aria-label="Enlaces del pie">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="font-mono text-micro uppercase text-subtle transition-colors duration-150 ease-boreal hover:text-accent-text"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <p className="border-t border-border pt-6 font-mono text-micro uppercase text-disabled">
          © 2026 Boreal Data — AletheIA
        </p>
      </div>
    </footer>
  )
}
