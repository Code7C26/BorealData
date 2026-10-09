'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/lib/use-theme'
import { cn } from '@/lib/utils'

/**
 * Cambia entre Noche y Papel.
 *
 * El modo claro no es una cortesía: aula, informe impreso, captura para
 * compartir y usuarios con astigmatismo. Se entrega desde el día uno con la
 * misma cobertura de tokens y contraste AA.
 *
 * El modo real lo aplica el script del <head> antes del primer paint; acá solo se
 * lee (ver useTheme) para dibujar el ícono correcto desde el primer render.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, alternar } = useTheme()

  const Icon = theme === 'dark' ? Sun : Moon

  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
      className={cn(
        'inline-flex size-10 items-center justify-center rounded-pill border border-border',
        'text-subtle transition-colors duration-150 ease-boreal',
        'hover:border-accent-text hover:text-accent-text',
        className,
      )}
    >
      <Icon size={17} aria-hidden="true" />
    </button>
  )
}
