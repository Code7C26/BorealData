'use client'

import { Moon, Sun } from 'lucide-react'
import { traducciones } from '@/lib/idioma'
import { useTextos } from '@/lib/use-idioma'
import { useTheme } from '@/lib/use-theme'
import { cn } from '@/lib/utils'

const TEXTOS = traducciones({
  es: {
    aClaro: 'Cambiar a modo claro',
    aOscuro: 'Cambiar a modo oscuro',
    claro: 'Modo claro',
    oscuro: 'Modo oscuro',
  },
  en: {
    aClaro: 'Switch to light mode',
    aOscuro: 'Switch to dark mode',
    claro: 'Light mode',
    oscuro: 'Dark mode',
  },
})

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
  const t = useTextos(TEXTOS)

  const Icon = theme === 'dark' ? Sun : Moon

  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={theme === 'dark' ? t.aClaro : t.aOscuro}
      title={theme === 'dark' ? t.claro : t.oscuro}
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
