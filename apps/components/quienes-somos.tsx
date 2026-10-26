'use client'

import { LogoBorealData } from '@/components/logo-boreal'
import { traducciones } from '@/lib/idioma'
import { useTextos } from '@/lib/use-idioma'

const TEXTOS = traducciones({
  es: {
    eyebrow: 'Quiénes somos',
    titulo: 'Boreal Data hace herramientas para que la información se pueda chequear.',
    parrafo1:
      'AletheIA es nuestro primer producto y nació de una idea simple: a la desinformación no se le gana pidiéndole a la gente que confíe en un algoritmo, sino mostrando el trabajo. Qué fuente se revisó, con qué se cruzó y por qué se llegó a ese veredicto.',
    parrafo2:
      'Por eso cada análisis muestra el razonamiento completo, también cuando no alcanza para concluir. Preferimos un «no tenemos datos suficientes» honesto antes que un veredicto que no se pueda justificar. Aletheia, de hecho, es eso: lo que deja de estar oculto.',
    datos: [
      { etiqueta: 'Producto', valor: 'AletheIA' },
      { etiqueta: 'Equipo', valor: 'Ciro Di Marsico · Renzo Lanata' },
      { etiqueta: 'Desde', valor: '2026' },
      { etiqueta: 'Dónde', valor: 'Córdoba, Argentina' },
    ],
  },
  en: {
    eyebrow: 'About us',
    titulo: 'Boreal Data builds tools that make information checkable.',
    parrafo1:
      "AletheIA is our first product, and it grew out of a simple idea: you don't beat misinformation by asking people to trust an algorithm, but by showing the work. Which source was reviewed, what it was cross-checked against and why it led to that verdict.",
    parrafo2:
      'That is why every analysis shows the full reasoning, even when it isn\'t enough to reach a conclusion. We would rather give an honest "we don\'t have enough data" than a verdict we can\'t justify. Aletheia, in fact, means just that: what stops being hidden.',
    datos: [
      { etiqueta: 'Product', valor: 'AletheIA' },
      { etiqueta: 'Team', valor: 'Ciro Di Marsico · Renzo Lanata' },
      { etiqueta: 'Since', valor: '2026' },
      { etiqueta: 'Where', valor: 'Córdoba, Argentina' },
    ],
  },
})

export function QuienesSomos() {
  const t = useTextos(TEXTOS)

  return (
    <section
      id="boreal-data"
      className="border-t border-border px-gutter py-32 md:px-6 md:py-40"
      aria-labelledby="boreal-title"
    >
      <div className="mx-auto grid max-w-shell grid-cols-1 gap-16 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="eyebrow">{t.eyebrow}</p>
          {/* La firma de la casa: acá es donde habla Boreal Data, no AletheIA.
              Va en su propia línea — el lockup es inline-flex. */}
          <div className="mt-8">
            <LogoBorealData className="text-[2.5rem]" />
          </div>
          <h2 id="boreal-title" className="mt-6 text-balance font-display text-h2-fluid text-display">
            {t.titulo}
          </h2>
        </div>

        <div>
          <p className="max-w-texto text-pretty text-muted">{t.parrafo1}</p>
          <p className="mt-5 max-w-texto text-pretty text-muted">{t.parrafo2}</p>

          <dl className="mt-12 border-t border-border">
            {t.datos.map((dato) => (
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
