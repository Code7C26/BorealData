'use client'

import { ResultCard } from '@/components/result/result-card'
import { ANALISIS_EJEMPLO, FECHA_EJEMPLO } from '@/lib/ejemplo'
import { traducciones } from '@/lib/idioma'
import { useTextos } from '@/lib/use-idioma'

/**
 * "Así se lee un análisis".
 *
 * Esto NO es una maqueta: es el mismo componente de la card de resultado, con
 * un análisis real precargado. Mostrar la pieza verdadera —y no un dibujo de
 * ella— es coherente con el producto: si el argumento es "mirá la evidencia",
 * la landing no puede abrir con una ilustración de un resultado.
 *
 * Al costado van las tres decisiones que definen la card, anotadas. Son las
 * mismas que están en la identidad V1.
 */
const TEXTOS = traducciones({
  es: {
    eyebrow: 'Un análisis de verdad',
    titulo: 'Así se lee un resultado',
    bajada:
      'Esta card es la misma que vas a ver al analizar una nota, con un caso real cargado. Jerarquía: qué pasó, cuánta certeza, dónde miramos, cómo lo pensamos.',
    decision: 'Decisión',
    decisiones: [
      {
        n: '01',
        titulo: 'El titular es una frase, no la etiqueta',
        texto:
          '"No encontramos respaldo" dice qué pasó. La etiqueta vive en el chip, chica, para quien escanea. Nadie lee "FALSO" en catástrofe.',
      },
      {
        n: '02',
        titulo: 'Cinco segmentos, ningún porcentaje',
        texto:
          'La confianza comunica orden de magnitud sin fingir precisión decimal. Un "72 %" no significa nada verificable; "alta" sí.',
      },
      {
        n: '03',
        titulo: 'Las fuentes van con su postura',
        texto:
          'Incluso las que contradicen el veredicto, y el blog donde se originó la cadena. Esa es la diferencia con un puntaje cerrado.',
      },
    ],
  },
  en: {
    eyebrow: 'A real analysis',
    titulo: 'How to read a result',
    bajada:
      "This card is the same one you'll see when you analyze an article, loaded with a real case. Hierarchy: what happened, how certain we are, where we looked, how we thought it through.",
    decision: 'Decision',
    decisiones: [
      {
        n: '01',
        titulo: 'The headline is a sentence, not the label',
        texto:
          '"We found no support" says what happened. The label lives in the chip, small, for whoever is skimming. Nobody reads "FALSE" as a catastrophe.',
      },
      {
        n: '02',
        titulo: 'Five segments, no percentages',
        texto:
          'Confidence conveys order of magnitude without faking decimal precision. A "72%" means nothing verifiable; "high" does.',
      },
      {
        n: '03',
        titulo: 'Sources come with where they stand',
        texto:
          "Even the ones that contradict the verdict, and the blog where the chain started. That's the difference from a closed score.",
      },
    ],
  },
})

export function AnalisisDemo() {
  const t = useTextos(TEXTOS)
  const analisis = useTextos(ANALISIS_EJEMPLO)

  return (
    <section
      id="como-funciona"
      className="border-t border-border px-gutter py-32 md:px-6 md:py-40"
      aria-labelledby="demo-title"
    >
      <div className="mx-auto max-w-shell">
        <div className="max-w-texto">
          <p className="eyebrow">{t.eyebrow}</p>
          <h2
            id="demo-title"
            className="mt-4 text-balance font-display text-h2-fluid text-display"
          >
            {t.titulo}
          </h2>
          <p className="mt-4 text-pretty text-muted">{t.bajada}</p>
        </div>

        <div className="mt-14 grid grid-cols-1 items-start gap-12 xl:grid-cols-[minmax(0,720px)_1fr]">
          <ResultCard analysis={analisis} fecha={FECHA_EJEMPLO} showActions={false} />

          <ol className="flex flex-col gap-10 xl:pt-6">
            {t.decisiones.map((d) => (
              <li key={d.n} className="flex flex-col gap-2 border-t border-border pt-5">
                <span className="font-mono text-micro uppercase text-accent-text">
                  {t.decision} {d.n}
                </span>
                <h3 className="font-display text-body font-semibold text-display">{d.titulo}</h3>
                <p className="max-w-texto text-body-sm text-muted">{d.texto}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}
