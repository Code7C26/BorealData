'use client'

import { Globe } from 'lucide-react'
import { IDIOMAS, NOMBRE_IDIOMA, traducciones } from '@/lib/idioma'
import { useIdioma, useTextos } from '@/lib/use-idioma'
import { cn } from '@/lib/utils'

const TEXTOS = traducciones({
  es: { grupo: 'Idioma', cambiarA: 'Cambiar a' },
  en: { grupo: 'Language', cambiarA: 'Switch to' },
})

/**
 * ES / EN, para la barra de la landing y las pantallas sin sesión.
 *
 * Mismo alto y mismo borde que el ThemeToggle, que va al lado. Cada opción se escribe
 * en su propio idioma ("English" aunque la página esté en castellano): quien no lee
 * español tiene que poder encontrar la salida sin leer español.
 */
export function SelectorIdioma({ className }: { className?: string }) {
  const { idioma, setIdioma } = useIdioma()
  const t = useTextos(TEXTOS)

  return (
    <div
      role="group"
      aria-label={t.grupo}
      className={cn(
        'inline-flex h-10 shrink-0 items-center gap-0.5 rounded-pill border border-border p-1',
        className,
      )}
    >
      <Globe aria-hidden="true" size={15} className="mx-1.5 text-subtle" />
      {IDIOMAS.map((opcion) => (
        <button
          key={opcion}
          type="button"
          lang={opcion}
          onClick={() => setIdioma(opcion)}
          aria-pressed={idioma === opcion}
          aria-label={idioma === opcion ? NOMBRE_IDIOMA[opcion] : `${t.cambiarA} ${NOMBRE_IDIOMA[opcion]}`}
          title={NOMBRE_IDIOMA[opcion]}
          className={cn(
            'h-full rounded-pill px-2.5 font-mono text-micro uppercase transition-colors duration-150 ease-boreal',
            idioma === opcion
              ? 'bg-accent/15 text-accent-text'
              : 'text-subtle hover:text-ink',
          )}
        >
          {opcion}
        </button>
      ))}
    </div>
  )
}
