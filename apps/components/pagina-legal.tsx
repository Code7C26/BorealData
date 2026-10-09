/**
 * Piezas compartidas de /privacidad y /terminos.
 *
 * Las dos páginas son texto largo y nada más, así que no necesitan componentes
 * propios: necesitan que el texto se lea. `Seccion` fija la jerarquía (título
 * en mono chico, cuerpo en medida de lectura) para que las dos se vean como la
 * misma pieza sin repetir las clases en cada bloque.
 */
export function Seccion({
  titulo,
  children,
}: {
  titulo: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-mono text-caption uppercase text-subtle">{titulo}</h2>
      <div className="flex max-w-texto flex-col gap-3 text-body-sm text-muted">{children}</div>
    </section>
  )
}

/** Lista con viñetas, con el aire del cuerpo de texto. */
export function Lista({ children }: { children: React.ReactNode }) {
  return <ul className="flex list-disc flex-col gap-2 pl-5">{children}</ul>
}

/**
 * La fecha de la última revisión, arriba y visible.
 *
 * Va destacada a propósito: en una política de privacidad, de cuándo es el
 * texto es parte de la información, no un detalle de pie de página.
 */
export function UltimaActualizacion({ fecha }: { fecha: string }) {
  return (
    <p className="font-mono text-micro uppercase text-disabled">Última actualización: {fecha}</p>
  )
}

/** Encabezado común: volanta, título grande, bajada y fecha. */
export function EncabezadoLegal({
  volanta,
  titulo,
  bajada,
  fecha,
}: {
  volanta: string
  titulo: string
  bajada: string
  fecha: string
}) {
  return (
    <header className="flex flex-col gap-3">
      <p className="eyebrow">{volanta}</p>
      <h1 className="font-display text-h2-fluid text-display">{titulo}</h1>
      <p className="max-w-texto text-muted">{bajada}</p>
      <UltimaActualizacion fecha={fecha} />
    </header>
  )
}
