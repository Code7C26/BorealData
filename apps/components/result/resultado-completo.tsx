'use client'

import { Languages } from 'lucide-react'
import { ResultCard } from '@/components/result/result-card'
import type { AnalyzeResponse } from '@/lib/api'
import { traducciones, type Idioma } from '@/lib/idioma'
import { useIdioma, useTextos } from '@/lib/use-idioma'
import { cn } from '@/lib/utils'

const TEXTOS = traducciones({
  es: {
    razonamientoCompleto: 'Razonamiento completo',
    deQueTrata: 'De qué trata la nota',
    sinResumen: 'El motor no dejó un resumen del contenido para este análisis.',
    senales: 'Señales de redacción',
    senalesBajada: 'Cómo está escrita la nota. Es una señal de contexto, no parte del veredicto.',
    aviso:
      'Esta verificación se apoya en la evidencia disponible al momento del análisis. Las fuentes están listadas con su postura para que puedas revisarlas vos.',
    otroIdioma: {
      en: 'Este análisis se pidió con la web en inglés, así que el titular, el razonamiento y las notas de las fuentes están en inglés. Si lo analizás de nuevo, sale en castellano.',
      es: '',
    } satisfies Record<Idioma, string>,
  },
  en: {
    razonamientoCompleto: 'Full reasoning',
    deQueTrata: 'What the article is about',
    sinResumen: "The engine didn't leave a summary of the content for this analysis.",
    senales: 'Writing signals',
    senalesBajada: "How the article is written. It's a context signal, not part of the verdict.",
    aviso:
      'This check relies on the evidence available at the time of the analysis. The sources are listed with where each one stands so you can review them yourself.',
    otroIdioma: {
      es: 'This analysis was written in Spanish, so the headline, reasoning and source notes are in Spanish. Analyze the article again to get it in English.',
      en: '',
    },
  },
})

/**
 * La pantalla de resultado completa: la card más el panel con todo lo que no entra en
 * ella.
 *
 * Vive acá y no dentro de una página porque la misma vista se usa en dos rutas:
 * `/resultado/[id]` (un análisis guardado — el caso normal, y también el link público de
 * compartir) y `/resultado` (el caso sin id: el ejemplo precargado y los análisis cuyo
 * guardado falló). Antes estaban escritas dos veces, y la versión del link compartido
 * mostraba solo la card: quien recibía una verificación por WhatsApp veía el veredicto
 * sin el razonamiento, justo lo contrario de lo que el producto promete.
 *
 * A 1280 es una grilla de minmax(0,720px) + 380 con gap 32 dentro del shell de 1120: la
 * card se queda en 720 y el razonamiento entero va al panel lateral, que scrollea
 * mientras la card queda sticky. Por debajo de 1280 el panel cae abajo, apilado.
 *
 * El panel se muestra SIEMPRE, sin botón de por medio: mostrar el trabajo es el producto,
 * no un extra que haya que pedir. (El botón "ver razonamiento completo" sobrevive solo en
 * la extensión, donde sí lleva a otro lado.) Como el panel ya lista los pasos, la card no
 * repite su resumen.
 */
export function ResultadoCompleto({
  analysis,
  fecha,
  acciones,
}: {
  analysis: AnalyzeResponse
  fecha?: string
  /** Botonera propia de cada contexto (volver al historial, borrar, verificar otra). */
  acciones?: React.ReactNode
}) {
  return (
    <div
      className={cn(
        'mx-auto grid w-full max-w-shell gap-8 px-gutter py-12 md:px-6 md:py-16',
        'xl:grid-cols-[minmax(0,720px)_380px] xl:items-start',
      )}
    >
      <div className="flex flex-col gap-6 xl:sticky xl:top-24">
        <ResultCard analysis={analysis} fecha={fecha} razonamientoAparte />
        {acciones}
      </div>

      <PanelRazonamiento analysis={analysis} />
    </div>
  )
}

/**
 * El contenido que no entra en la card: de qué trata la nota, las señales de tono y el
 * razonamiento entero sin recortar. La card nunca crece — a partir de 720 px el contenido
 * extra va acá, no al ancho.
 */
function PanelRazonamiento({ analysis }: { analysis: AnalyzeResponse }) {
  const t = useTextos(TEXTOS)
  const { idioma } = useIdioma()
  // Lo que escribió Gemini queda en el idioma en que se pidió. Si no coincide con el de la
  // interfaz (un análisis viejo, siempre en castellano, visto con la web en inglés, o al
  // revés), se dice arriba de todo: si no, la pantalla parece traducida a medias.
  // Sin `language` (el ejemplo precargado) no se avisa nada.
  const avisoIdioma =
    analysis.language && analysis.language !== idioma ? t.otroIdioma[analysis.language] : ''

  return (
    <aside
      className="flex animate-rise flex-col gap-6 xl:max-w-panel"
      aria-label={t.razonamientoCompleto}
    >
      {avisoIdioma && (
        <p
          lang={idioma}
          className="flex items-start gap-2.5 rounded-lg border border-border bg-surface-sunk p-3.5 text-caption tracking-normal text-subtle"
        >
          <Languages aria-hidden="true" size={14} className="mt-0.5 shrink-0 text-accent-text" />
          {avisoIdioma}
        </p>
      )}
      <section className="panel flex flex-col gap-4">
        <h2 className="font-mono text-caption uppercase text-subtle">{t.deQueTrata}</h2>
        <p className="text-body-sm text-muted">{analysis.summary || t.sinResumen}</p>
        {analysis.title && (
          <p className="border-t border-border pt-4 font-display text-body-sm font-semibold text-display">
            {analysis.title}
          </p>
        )}
      </section>

      {analysis.reasoning.length > 0 && (
        <section className="panel flex flex-col gap-4">
          <h2 className="font-mono text-caption uppercase text-subtle">{t.razonamientoCompleto}</h2>
          <ol className="flex flex-col gap-4">
            {analysis.reasoning.map((paso, i) => (
              <li key={i} className="flex items-start gap-3.5">
                <span
                  aria-hidden="true"
                  className="w-5 shrink-0 pt-1 font-mono text-caption tracking-normal text-accent-text"
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <p className="text-body-sm text-ink">{paso}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {analysis.toneFlags.length > 0 && (
        <section className="panel flex flex-col gap-4">
          <h2 className="font-mono text-caption uppercase text-subtle">{t.senales}</h2>
          <p className="text-caption tracking-normal text-subtle">{t.senalesBajada}</p>
          <ul className="flex flex-wrap gap-2">
            {analysis.toneFlags.map((flag) => (
              <li
                key={flag}
                className="rounded-pill border border-border px-3 py-1 font-mono text-micro uppercase text-subtle"
              >
                {flag}
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="px-1 text-caption tracking-normal text-disabled">{t.aviso}</p>
    </aside>
  )
}
