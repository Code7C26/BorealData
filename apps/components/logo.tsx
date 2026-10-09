import { LogoBorealData } from '@/components/logo-boreal'
import { cn } from '@/lib/utils'

/**
 * Isotipo "Umbral".
 *
 * Aletheia es lo que deja de estar oculto: la tapa se levanta y aparece la luz.
 * Un disco que emerge, no un ojo que vigila — los caminos con lupa, escudo, ojo
 * o tilde de verificado quedaron descartados justamente por eso: AletheIA no
 * juzga desde arriba, muestra lo que encontró.
 *
 * Doble lectura: tapa levantada (lo revelado) y sol sobre el horizonte (la idea
 * boreal, luz en la oscuridad, el norte).
 *
 * Construcción — grilla de 64:
 *   · Velo de 48×8, radio total, en Luz Boreal, con 8 unidades de aire. Ese
 *     mismo aire funciona como margen mínimo del isotipo.
 *   · Disco r=24 centrado en 32/36, en Violeta Aurora, cortado por la recta
 *     y=22 (el corte deja la masa grande, de ahí el arco "large" de abajo).
 *
 * Son dos masas y no un dibujo: por eso sobrevive a 16 px.
 */
export function LogoMark({
  className,
  animated = false,
}: {
  className?: string
  /** El velo se levanta al montar. Solo para entradas grandes (hero, login). */
  animated?: boolean
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={cn('h-10 w-10 shrink-0', className)}
      fill="none"
      aria-hidden="true"
    >
      {/* Disco: la verdad revelada. El arco va del extremo izquierdo del corte
          al derecho por abajo — large-arc=1, sweep=0. */}
      <path
        d="M12.51 22 A24 24 0 1 0 51.49 22 Z"
        fill="var(--accent)"
        className={animated ? 'motion-safe:animate-rise' : undefined}
      />
      {/* Velo: la tapa levantada. */}
      <rect
        x="8"
        y="6"
        width="48"
        height="8"
        rx="4"
        fill="var(--display)"
        className={animated ? 'motion-safe:animate-veil-lift' : undefined}
      />
    </svg>
  )
}

/**
 * Lockup completo. El acento va solo en "IA": el resto de la palabra queda en el
 * color de titular.
 */
export function Logo({
  className,
  showParent = false,
  animated = false,
}: {
  className?: string
  /** Agrega la bajada "Boreal Data". Solo donde hace falta firmar. */
  showParent?: boolean
  animated?: boolean
}) {
  return (
    <span className={cn('inline-flex items-center gap-3', className)}>
      <LogoMark animated={animated} className="h-9 w-9" />
      <span className="flex flex-col leading-none">
        <span className="font-display text-[1.375rem] font-bold tracking-[-0.02em] text-display">
          Alethe<span className="text-accent-text">IA</span>
        </span>
        {/* La firma de la casa va con su logotipo, no escrita a mano en mono:
            antes acá decía "Boreal Data" como texto suelto en versalitas, que
            es justo lo que la marca 4d no es (el corte de peso Boreal/Data ES
            la marca). Sin bajada, como en cualquier tamaño chico.

            0.9rem está elegido por altura, no por ancho: deja la caja en 15.3 px
            contra los 15.2 del texto que reemplaza, así la navbar no cambia de
            alto. Igualar el ancho hubiera pedido 1.1rem (18.7 px de alto) y el
            lockup le hubiera empezado a competir al nombre del producto, que
            va arriba en 1.375rem. */}
        {showParent && <LogoBorealData bajada={false} className="mt-1 text-[0.9rem]" />}
      </span>
    </span>
  )
}
