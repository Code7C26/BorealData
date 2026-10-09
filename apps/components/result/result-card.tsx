'use client'

import { useState } from 'react'
import { Check, ExternalLink, Share2 } from 'lucide-react'
import type { AnalysisSource, AnalyzeResponse } from '@/lib/api'
import { normalize, STANCE, VERDICT } from '@/lib/verdict'
import { cn } from '@/lib/utils'
import { ConfidenceMeter } from './confidence-meter'

/** Cuánto se muestra el estado "copiado" antes de volver al botón normal. */
const FEEDBACK_COPIADO_MS = 2000

/** Cuántos pasos se ven en mobile antes de expandir in-situ. */
const PASOS_VISIBLES_MOBILE = 2

/**
 * La card de resultado — el único objeto que el usuario realmente lee.
 *
 * Jerarquía: qué pasó → cuánta certeza → dónde miramos → cómo lo pensamos.
 *
 * Tres decisiones que la definen:
 *  01. El titular es una frase en lenguaje natural ("No encontramos respaldo"),
 *      no la etiqueta. La etiqueta vive en el chip, chica, para quien escanea.
 *  02. La confianza es de cinco segmentos, no un porcentaje.
 *  03. Las fuentes se listan con su postura incluso cuando contradicen el
 *      veredicto. Esa es la diferencia con un puntaje cerrado.
 *
 * La card nunca crece: a partir de 720 px el contenido extra va al panel
 * lateral, no al ancho (el layout de 1280 vive en la página, no acá).
 */
/**
 * La URL de la nota, solo si hay uno al que se pueda ir de verdad.
 *
 * No alcanza con `url && ...`: los análisis de contenido guardan `url` como cadena vacía
 * cuando no hubo página de origen (una imagen subida desde el dashboard), y los del
 * esquema viejo pueden traer cualquier cosa. Devuelve null salvo que sea http(s).
 */
function enlaceDeLaNota(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const { protocol } = new URL(url)
    return protocol === 'http:' || protocol === 'https:' ? url : null
  } catch {
    return null
  }
}

export function ResultCard({
  analysis,
  fecha,
  razonamientoAparte = false,
  showActions = true,
  className,
}: {
  analysis: AnalyzeResponse
  /** ISO del momento del análisis. Sin esto no se muestra la fecha. */
  fecha?: string
  /**
   * true donde el razonamiento entero ya se muestra al lado de la card (la
   * pantalla de resultado). Ahí el resumen de la card sería el mismo texto dos
   * veces, así que no se dibuja.
   */
  razonamientoAparte?: boolean
  /** false en la landing: ahí la card se muestra, no se opera. */
  showActions?: boolean
  className?: string
}) {
  const { verdict, confidence } = normalize(analysis.verdict, analysis.confidence)
  const meta = VERDICT[verdict]
  const Icon = meta.icon
  const [pasosExpandidos, setPasosExpandidos] = useState(false)

  const pasos = analysis.reasoning
  const hayPasosOcultos = pasos.length > PASOS_VISIBLES_MOBILE
  const enlace = enlaceDeLaNota(analysis.url)

  return (
    <article
      aria-labelledby="result-headline"
      className={cn('card-shell animate-rise', meta.borderTop, className)}
    >
      {/* 1 · chip + fecha */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <p className={cn('chip', meta.text)}>
          <Icon aria-hidden="true" size={14} strokeWidth={2.25} />
          {meta.label}
        </p>
        {fecha && (
          <time dateTime={fecha} className="pt-1.5 font-mono text-micro uppercase text-subtle">
            {new Intl.DateTimeFormat('es-AR', {
              dateStyle: 'medium',
              timeStyle: 'short',
            }).format(new Date(fecha))}
          </time>
        )}
      </header>

      {/* 2 · titular en lenguaje natural, nunca la etiqueta */}
      <div className="flex flex-col gap-3">
        {analysis.title && (
          <p className="line-clamp-2 font-mono text-caption uppercase tracking-normal text-subtle">
            {analysis.title}
          </p>
        )}
        <h2
          id="result-headline"
          className="font-display text-[1.5rem] leading-[1.15] font-semibold tracking-[-0.02em] text-display md:text-[2rem]"
        >
          {analysis.headline}
        </h2>
        {analysis.lead && <p className="text-muted">{analysis.lead}</p>}

        {/* Solo si hay una página a la que ir. Un análisis de imagen subida desde el
            dashboard no tiene URL (`url` llega como ""), y antes el chip se dibujaba
            igual: quedaba una caja vacía que además era un <a href="">, o sea un enlace
            que recargaba la página actual. Una captura hecha desde la extensión sí
            suele traer la dirección de dónde salió, y ahí el chip corresponde. */}
        {enlace && (
          <a
            href={enlace}
            target="_blank"
            rel="noopener noreferrer"
            title={enlace}
            className="group flex items-center gap-2 truncate rounded-lg bg-surface-sunk px-3.5 py-2.5 font-mono text-caption tracking-normal text-subtle transition-colors duration-150 ease-boreal hover:text-accent-text"
          >
            <span className="truncate">{enlace.replace(/^https?:\/\//, '')}</span>
            <ExternalLink
              aria-hidden="true"
              size={13}
              className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
            />
          </a>
        )}
      </div>

      {/* 3 · confianza */}
      <ConfidenceMeter verdict={verdict} confidence={confidence} />

      {/* 4 · fuentes */}
      {analysis.sources.length > 0 && (
        <section className="card-block gap-3.5">
          <div className="flex items-baseline justify-between gap-4">
            <h3 className="font-mono text-caption uppercase text-subtle">Fuentes consultadas</h3>
            <span className="font-mono text-caption text-subtle">{analysis.sources.length}</span>
          </div>
          <ul className="flex flex-col gap-2.5">
            {analysis.sources.map((fuente, i) => (
              <SourceRow key={`${fuente.domain}-${i}`} source={fuente} />
            ))}
          </ul>
        </section>
      )}

      {/* 5 · razonamiento */}
      {pasos.length > 0 && !razonamientoAparte && (
        <section className="card-block gap-4">
          <h3 className="font-mono text-caption uppercase text-subtle">Razonamiento resumido</h3>
          <ol className="flex flex-col gap-3.5">
            {pasos.map((paso, i) => (
              <li
                key={i}
                className={cn(
                  'flex items-start gap-3.5',
                  // En mobile se muestran 2 pasos y el resto expande in-situ.
                  // En md+ están todos siempre: la card tiene aire de sobra.
                  !pasosExpandidos && i >= PASOS_VISIBLES_MOBILE && 'hidden md:flex',
                )}
              >
                <span aria-hidden="true" className="w-5 shrink-0 pt-1 font-mono text-caption tracking-normal text-subtle">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <p className="text-body-sm text-ink">{paso}</p>
              </li>
            ))}
          </ol>
          {hayPasosOcultos && !pasosExpandidos && (
            <button
              type="button"
              onClick={() => setPasosExpandidos(true)}
              className="self-start font-mono text-caption text-accent-text underline-offset-4 hover:underline md:hidden"
            >
              Ver los {pasos.length} pasos
            </button>
          )}
        </section>
      )}

      {/* 6 · acciones */}
      {showActions && (
        <footer className="card-block flex-col gap-3 md:flex-row">
          {/* En la web el razonamiento no se pide: está ahí. El botón de "ver
              razonamiento completo" quedó solo en la extensión, donde sí lleva
              a otro lado (abre la pestaña de AletheIA). */}
          {/* `shareable: false` lo manda /analyze/content: el análisis existe y
              tiene id, pero /resultado/:id no lo sirve (salió de algo privado).
              Ofrecer el botón ahí sería copiar un link roto. */}
          {analysis.shareable !== false && (
            <BotonCompartir id={analysis.id} className="md:w-auto" />
          )}
        </footer>
      )}
    </article>
  )
}

/**
 * Una fila de fuente. En <768 pasa a dos líneas (la postura baja debajo del
 * dominio); desde 768 vuelve a la grilla 1fr auto de una sola línea.
 *
 * El dominio va en mono porque es un dato, no prosa. Si la fuente tiene URL real
 * la fila es un enlace; si el veredicto salió del propio texto (sin búsqueda),
 * queda como <div> en vez de inventar un link.
 */
function SourceRow({ source }: { source: AnalysisSource }) {
  const stance = STANCE[source.stance] ?? STANCE['sin-datos']

  // El dominio es un dato y va en mono; cuando la fuente no tiene dominio —los
  // análisis del esquema viejo casi nunca lo tienen— lo que queda es el título,
  // que es prosa y se lee mucho mejor en la tipografía de cuerpo.
  const esDominio = source.domain.length > 0
  const etiqueta = esDominio ? source.domain : source.title

  const contenido = (
    <>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span
          className={cn(
            'truncate text-caption tracking-normal text-ink',
            esDominio && 'font-mono',
          )}
          title={source.title || source.domain}
        >
          {etiqueta}
        </span>
        {source.note && (
          <span className="text-caption tracking-normal text-subtle">{source.note}</span>
        )}
      </span>
      <span
        className={cn(
          'justify-self-start rounded-pill border border-border px-2.5 py-1',
          'font-mono text-micro uppercase md:justify-self-end',
          stance.text,
        )}
      >
        {stance.label}
      </span>
    </>
  )

  const clases =
    'grid min-h-14 grid-cols-1 items-center gap-2 rounded-lg bg-surface-sunk px-3.5 py-3 md:grid-cols-[1fr_auto] md:gap-4'

  return (
    <li>
      {source.url ? (
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            clases,
            'border border-transparent transition-colors duration-150 ease-boreal hover:border-border-strong',
          )}
        >
          {contenido}
        </a>
      ) : (
        <div className={clases}>{contenido}</div>
      )}
    </li>
  )
}

/**
 * Copia el link público de la verificación (/resultado/:id), que se abre sin
 * cuenta — es la forma en que un análisis sale de la app. Sin id (el ejemplo
 * precargado, o un análisis que no se llegó a guardar) cae a la URL actual en
 * vez de armar un link roto.
 */
function BotonCompartir({ id, className }: { id?: string | null; className?: string }) {
  const [copiado, setCopiado] = useState(false)

  const compartir = async () => {
    if (typeof window === 'undefined') return
    const link = id ? `${window.location.origin}/resultado/${id}` : window.location.href
    try {
      await navigator.clipboard?.writeText(link)
      setCopiado(true)
      setTimeout(() => setCopiado(false), FEEDBACK_COPIADO_MS)
    } catch {
      // navigator.clipboard puede no existir (contexto no seguro) o el permiso
      // puede estar denegado — no rompemos la UI, solo no mostramos el check.
    }
  }

  return (
    <button type="button" onClick={compartir} className={cn('btn-secondary w-full', className)}>
      {copiado ? (
        <>
          <Check aria-hidden="true" size={16} className="text-verdict-verificado" />
          Enlace copiado
        </>
      ) : (
        <>
          <Share2 aria-hidden="true" size={16} />
          Compartir verificación
        </>
      )}
    </button>
  )
}
