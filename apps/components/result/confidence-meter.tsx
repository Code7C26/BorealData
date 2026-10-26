'use client'

import { traducciones } from '@/lib/idioma'
import { useTextos } from '@/lib/use-idioma'
import { useVocabulario } from '@/lib/use-vocabulario'
import type { Confidence, Verdict } from '@/lib/verdict'
import { cn } from '@/lib/utils'

const TEXTOS = traducciones({
  es: {
    titulo: 'Nivel de confianza',
    valor: (nivel: string, n: number) => `Confianza ${nivel}, ${n} de 5`,
    etiqueta: 'Nivel de confianza del análisis',
  },
  en: {
    titulo: 'Confidence level',
    valor: (nivel: string, n: number) => `${nivel} confidence, ${n} out of 5`,
    etiqueta: 'Confidence level of the analysis',
  },
})

/**
 * Nivel de confianza en cinco segmentos, no un porcentaje sin cuerpo: comunica
 * orden de magnitud sin fingir precisión decimal.
 *
 * La etiqueta ("Muy alta") y la nota de abajo salen del MISMO nivel — el
 * veredicto solo aporta el color. En la V1 salían de lugares distintos y podían
 * decir "Muy alta" y "Alta" a la vez.
 *
 * Accesibilidad: role="meter" con aria-valuetext = la etiqueta, nunca el número
 * solo. Un lector de pantalla tiene que escuchar "Confianza muy alta, 5 de 5".
 */
export function ConfidenceMeter({
  verdict,
  confidence,
  className,
}: {
  verdict: Verdict
  confidence: Confidence
  className?: string
}) {
  const t = useTextos(TEXTOS)
  const { CONFIDENCE, VERDICT } = useVocabulario()
  const { label, note } = CONFIDENCE[confidence]
  const meta = VERDICT[verdict]

  return (
    <section className={cn('card-block gap-3', className)}>
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="font-mono text-caption uppercase text-subtle">{t.titulo}</h3>
        <p className={cn('font-display text-[1.25rem] leading-none font-semibold', meta.text)}>
          {label}
        </p>
      </div>

      <div
        role="meter"
        aria-valuemin={1}
        aria-valuemax={5}
        aria-valuenow={confidence}
        aria-valuetext={t.valor(label.toLowerCase(), confidence)}
        aria-label={t.etiqueta}
        className="flex h-2 gap-1"
      >
        {[1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            className={cn(
              'flex-1 rounded-pill transition-colors duration-300 ease-boreal',
              i <= confidence ? meta.bg : 'bg-border',
            )}
          />
        ))}
      </div>

      <p className="text-body-sm text-subtle">{note}</p>
    </section>
  )
}
