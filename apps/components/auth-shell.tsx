import Link from 'next/link'
import { Aurora } from '@/components/aurora'
import { Logo } from '@/components/logo'
import { ThemeToggle } from '@/components/theme-toggle'

/**
 * El marco compartido de /login y /registro.
 *
 * Usa la misma caja que el resto del producto (`card-shell` con el borde
 * superior neutro: ningún color de veredicto donde no hay veredicto), para que
 * entrar a la app no se sienta como otra aplicación.
 */
export function AuthShell({
  eyebrow,
  titulo,
  bajada,
  children,
  pie,
}: {
  eyebrow: string
  titulo: string
  bajada: string
  children: React.ReactNode
  pie: React.ReactNode
}) {
  return (
    <main className="relative isolate flex min-h-screen flex-col items-center justify-center overflow-hidden px-gutter py-12 md:px-6">
      <Aurora intensity="loud" />
      <div aria-hidden="true" className="noise-field" />

      <ThemeToggle className="absolute right-4 top-4 md:right-6 md:top-6" />

      <Link href="/" className="relative mb-10" aria-label="AletheIA — inicio">
        <Logo showParent animated />
      </Link>

      <section className="card-shell relative max-w-[440px] animate-rise border-t-border">
        <header className="flex flex-col gap-3">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="font-display text-h3 font-semibold text-display">{titulo}</h1>
          <p className="text-body-sm text-muted">{bajada}</p>
        </header>

        {children}

        <p className="border-t border-border pt-6 text-center text-body-sm text-muted">{pie}</p>
      </section>

      <p className="relative mt-8 font-mono text-micro uppercase text-disabled">
        © 2026 Boreal Data — AletheIA
      </p>
    </main>
  )
}

/** Campo de formulario con label, error accesible y slot para íconos/acciones. */
export function Campo({
  label,
  htmlFor,
  extra,
  children,
}: {
  label: string
  htmlFor: string
  /** Acción a la derecha del label (ej. "¿Olvidaste tu contraseña?"). */
  extra?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-4">
        <label htmlFor={htmlFor} className="field-label">
          {label}
        </label>
        {extra}
      </div>
      {children}
    </div>
  )
}
