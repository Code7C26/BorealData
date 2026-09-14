import { cn } from '@/lib/utils'

/**
 * El ambiente de la marca: tres bandas de luz a la deriva sobre la Noche, una
 * por cada capa de verificación (fuente, contexto, contraste).
 *
 * Va como primer hijo de un contenedor `relative isolate overflow-hidden`.
 *
 * Decisión del producto: este movimiento NO se apaga con "reducir movimiento"
 * del sistema (ver la excepción de `.aurora-band` al final de global.css). Es
 * deriva lenta y difuminada de fondo: no desplaza contenido ni texto, y sin
 * ella la pantalla queda plana. El resto del movimiento de la app sí respeta
 * la preferencia.
 */
export function Aurora({
  className,
  intensity = 'normal',
  grid = true,
}: {
  className?: string
  /** `soft` para pantallas densas (dashboard, historial); `loud` para hero y auth. */
  intensity?: 'soft' | 'normal' | 'loud'
  grid?: boolean
}) {
  const escala = intensity === 'loud' ? 1.25 : intensity === 'soft' ? 0.7 : 1

  return (
    <>
      <div className="aurora-field" aria-hidden="true">
        <span
          className="aurora-band animate-aurora-drift"
          style={{
            background: 'var(--aurora-a)',
            width: `${52 * escala}vw`,
            height: `${30 * escala}vw`,
            top: '-14vw',
            left: '-8vw',
          }}
        />
        <span
          className="aurora-band animate-aurora-drift-slow"
          style={{
            background: 'var(--aurora-b)',
            width: `${44 * escala}vw`,
            height: `${26 * escala}vw`,
            top: '-4vw',
            right: '-10vw',
            animationDelay: '-9s',
          }}
        />
        <span
          className="aurora-band animate-aurora-drift"
          style={{
            background: 'var(--aurora-c)',
            width: `${38 * escala}vw`,
            height: `${16 * escala}vw`,
            top: '22vw',
            left: '28vw',
            animationDelay: '-17s',
          }}
        />
      </div>
      {grid && <div className={cn('grid-field', className)} aria-hidden="true" />}
    </>
  )
}
