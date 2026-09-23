import { cn } from '@/lib/utils'

/**
 * Lockup de Boreal Data — marca 4d (plantilla «BorealData Marca 4d»).
 *
 * Tres gestos, y nada más:
 *   · Corte de peso — «Boreal» en extrabold contra «Data» en light, sin espacio
 *     entre las dos. La palabra es una sola; el peso hace la división.
 *   · La raya violeta que precede a la bajada.
 *   · La bajada «Southern Data Co.» en mono, versalitas y tracking 0.3em.
 *
 * Todas las medidas van en `em` relativos a U (el cuerpo de la palabra), como
 * manda la plantilla: cambiando el `font-size` del lockup escala entero y las
 * proporciones se mantienen. Los valores salen de la tabla de la plantilla:
 * gap 0.23em, tracking -0.035em, bajada 0.23em, raya 0.04 × 0.46em.
 *
 * Color: la plantilla fija crema para «Boreal», lila para «Data», violeta en la
 * raya y gris en la bajada; acá van por su rol semántico (`display`,
 * `accent-text`, `accent`, `subtle`), que resuelve a esos mismos valores en
 * noche y da la colorway correcta sobre papel sin una segunda versión.
 *
 * Esta es la firma de la casa. El isotipo Umbral (`components/logo.tsx`) es de
 * AletheIA, el producto: no se mezclan en la misma línea.
 */
export function LogoBorealData({
  className,
  bajada = true,
  raya = true,
}: {
  className?: string
  /** La bajada «Southern Data Co.». Se cae en tamaños muy chicos. */
  bajada?: boolean
  raya?: boolean
}) {
  return (
    <span className={cn('inline-flex flex-col gap-[0.23em] leading-none', className)}>
      <span className="font-display text-[1em] leading-none tracking-[-0.035em]">
        <strong className="font-extrabold text-display">Boreal</strong>
        <span className="font-light text-accent-text">Data</span>
      </span>

      {bajada && (
        <span className="flex items-center gap-[0.19em] pl-[0.04em] font-mono text-[0.23em] uppercase leading-none tracking-[0.3em] text-subtle">
          {/* `min-h-px`: a tamaños chicos 0.04em cae por debajo del píxel y la
              raya desaparece; la plantilla la dibuja siempre. */}
          {raya && (
            <i aria-hidden="true" className="h-[0.04em] min-h-px w-[0.46em] shrink-0 bg-accent" />
          )}
          Southern Data Co.
        </span>
      )}
    </span>
  )
}
