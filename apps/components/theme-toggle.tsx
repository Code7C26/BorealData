'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { applyTheme, getStoredTheme, type Theme } from '@/lib/theme'
import { cn } from '@/lib/utils'

/**
 * Cambia entre Noche y Papel.
 *
 * El modo claro no es una cortesía: aula, informe impreso, captura para
 * compartir y usuarios con astigmatismo. Se entrega desde el día uno con la
 * misma cobertura de tokens y contraste AA.
 *
 * El botón arranca en "dark" (el valor del SSR) y se sincroniza en el primer
 * efecto: el script del <head> ya aplicó el modo real antes del paint, así que
 * lo único que puede quedar desalineado por un frame es el ícono.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>('dark')

  useEffect(() => {
    setTheme(getStoredTheme() ?? (document.documentElement.dataset.theme as Theme) ?? 'dark')
  }, [])

  const toggle = () => {
    const siguiente: Theme = theme === 'dark' ? 'light' : 'dark'
    applyTheme(siguiente)
    setTheme(siguiente)
  }

  const Icon = theme === 'dark' ? Sun : Moon

  return (
    <button
      type="button"
      onClick={toggle}
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
