/* Los corchetes son datos pendientes de completar, no texto definitivo. */
const DATOS = [
  { etiqueta: 'Producto', valor: 'AletheIA' },
  { etiqueta: 'Equipo', valor: '[CUÁNTAS PERSONAS]' },
  { etiqueta: 'Desde', valor: '[AÑO]' },
  { etiqueta: 'Dónde', valor: '[CIUDAD, PAÍS]' },
]

export function QuienesSomos() {
  return (
    <section
      id="boreal-data"
      className="border-t border-border px-gutter py-32 md:px-6 md:py-40"
      aria-labelledby="boreal-title"
    >
      <div className="mx-auto grid max-w-shell grid-cols-1 gap-16 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="eyebrow">Quiénes somos</p>
          <h2 id="boreal-title" className="mt-4 text-balance font-display text-h2-fluid text-display">
            Boreal Data hace herramientas para que la información se pueda chequear.
          </h2>
        </div>

        <div>
          <p className="max-w-texto text-pretty text-muted">
            AletheIA es nuestro primer producto y nació de una idea simple: a la desinformación no
            se le gana pidiéndole a la gente que confíe en un algoritmo, sino mostrando el trabajo.
            Qué fuente se revisó, con qué se cruzó y por qué se llegó a ese veredicto.
          </p>
          <p className="mt-5 max-w-texto text-pretty text-muted">
            Por eso cada análisis muestra el razonamiento completo, también cuando no alcanza para
            concluir. Preferimos un «no tenemos datos suficientes» honesto antes que un veredicto
            que no se pueda justificar. Aletheia, de hecho, es eso: lo que deja de estar oculto.
          </p>

          <dl className="mt-12 border-t border-border">
            {DATOS.map((dato) => (
              <div
                key={dato.etiqueta}
                className="flex items-center justify-between gap-6 border-b border-border py-4"
              >
                <dt className="font-mono text-micro uppercase text-subtle">{dato.etiqueta}</dt>
                <dd className="font-display text-body-sm font-medium text-display">{dato.valor}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  )
}
