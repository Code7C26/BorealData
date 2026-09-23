'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, RotateCcw } from 'lucide-react'
import { AnalysisPanel, type AnalysisState } from '@/components/result/analysis-panel'
import { ResultCard } from '@/components/result/result-card'
import type { AnalyzeResponse } from '@/lib/api'
import { leerResultado, type ResultadoGuardado } from '@/lib/resultado-storage'
import { cn } from '@/lib/utils'

/**
 * La pantalla de resultado.
 *
 * A 1280 la página es una grilla de minmax(0,720px) + 380 con gap 32 dentro del
 * shell de 1120: la card se queda en 720 y el razonamiento entero va al panel
 * lateral. La card queda sticky mientras se scrollea el panel. Por debajo de
 * 1280 el panel cae abajo, apilado.
 *
 * El panel se muestra SIEMPRE, sin botón de por medio: mostrar el trabajo es el
 * producto, no un extra que haya que pedir. (El botón "ver razonamiento
 * completo" sobrevive solo en la extensión, donde sí lleva a otro lado.) Como
 * el panel ya lista los pasos, la card no repite su resumen.
 */
function VistaResultado({ resultado }: { resultado: AnalyzeResponse & { fecha?: string } }) {
  return (
    <div
      className={cn(
        'mx-auto grid w-full max-w-shell gap-8 px-gutter py-12 md:px-6 md:py-16',
        'xl:grid-cols-[minmax(0,720px)_380px] xl:items-start',
      )}
    >
      <div className="xl:sticky xl:top-24">
        <ResultCard analysis={resultado} fecha={resultado.fecha} razonamientoAparte />
      </div>

      <PanelRazonamiento analysis={resultado} />
    </div>
  )
}

/**
 * El contenido que no entra en la card: de qué trata la nota, las señales de
 * tono y el razonamiento entero sin recortar. La card nunca crece — a partir de
 * 720 px el contenido extra va acá, no al ancho.
 */
function PanelRazonamiento({ analysis }: { analysis: AnalyzeResponse }) {
  return (
    <aside className="flex animate-rise flex-col gap-6 xl:max-w-panel" aria-label="Razonamiento completo">
      <section className="panel flex flex-col gap-4">
        <h2 className="font-mono text-caption uppercase text-subtle">De qué trata la nota</h2>
        <p className="text-body-sm text-muted">
          {analysis.summary || 'El motor no dejó un resumen del contenido para este análisis.'}
        </p>
        {analysis.title && (
          <p className="border-t border-border pt-4 font-display text-body-sm font-semibold text-display">
            {analysis.title}
          </p>
        )}
      </section>

      {analysis.reasoning.length > 0 && (
        <section className="panel flex flex-col gap-4">
          <h2 className="font-mono text-caption uppercase text-subtle">Razonamiento completo</h2>
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
          <h2 className="font-mono text-caption uppercase text-subtle">Señales de redacción</h2>
          <p className="text-caption tracking-normal text-subtle">
            Cómo está escrita la nota. Es una señal de contexto, no parte del veredicto.
          </p>
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

      <p className="px-1 text-caption tracking-normal text-disabled">
        Esta verificación se apoya en la evidencia disponible al momento del análisis. Las fuentes
        están listadas con su postura para que puedas revisarlas vos.
      </p>
    </aside>
  )
}

/** Volver al historial, solo cuando se llegó desde ahí. */
function VolverAlHistorial() {
  return (
    <div className="mx-auto w-full max-w-shell px-gutter pt-6 md:px-6">
      <Link
        href="/historial"
        className="sticky top-4 z-10 inline-flex w-fit items-center gap-2 rounded-pill border border-border bg-surface/90 px-4 py-2 font-display text-body-sm font-medium text-ink shadow-md backdrop-blur-md transition-colors duration-150 ease-boreal hover:border-accent-text hover:text-accent-text"
      >
        <ArrowLeft aria-hidden="true" size={16} />
        Volver al historial
      </Link>
    </div>
  )
}

/**
 * Errores y "sin contenido" se muestran en la MISMA caja que el resultado —
 * mismo ancho, radio, borde y padding — para que no haya salto de layout.
 */
function VistaError({ estado, valor }: { estado: AnalysisState; valor: string }) {
  const router = useRouter()

  return (
    <div className="mx-auto flex w-full max-w-card flex-col gap-6 px-gutter py-16 md:px-6">
      <AnalysisPanel
        state={estado as Exclude<AnalysisState, { kind: 'idle' }>}
        onRetry={() => router.push(`/analizando?tipo=url&valor=${encodeURIComponent(valor)}`)}
        onEditar={() => router.push('/dashboard')}
      />
      <Link href="/dashboard" className="btn-secondary self-start">
        <RotateCcw aria-hidden="true" size={16} />
        Analizar otra nota
      </Link>
    </div>
  )
}

function ResultadoContent({ desdeHistorial }: { desdeHistorial: boolean }) {
  const router = useRouter()
  const [resultado, setResultado] = useState<ResultadoGuardado | null>()

  useEffect(() => {
    const guardado = leerResultado()
    if (!guardado) {
      // No hay ningún análisis para mostrar (ej. se entró directo a /resultado
      // sin pasar por /analizando ni por el historial) — no hay nada que
      // renderizar acá.
      router.replace('/dashboard')
      return
    }
    setResultado(guardado)
  }, [router])

  if (!resultado) return null

  if (resultado.status === 'ok' && resultado.data) {
    return (
      <div className="min-h-screen">
        {desdeHistorial && <VolverAlHistorial />}
        <VistaResultado resultado={{ ...resultado.data, fecha: resultado.fecha }} />
      </div>
    )
  }

  const estado: AnalysisState =
    resultado.status === 'insuficiente'
      ? { kind: 'error-content', value: resultado.valor }
      : { kind: 'error-network', attempt: 1, code: resultado.codigo ?? 'NET_UNKNOWN' }

  return (
    <div className="min-h-screen">
      {desdeHistorial && <VolverAlHistorial />}
      <VistaError estado={estado} valor={resultado.valor} />
    </div>
  )
}

function ResultadoWrapper() {
  const searchParams = useSearchParams()

  // key = searchParams.toString() fuerza un remount cada vez que cambia el
  // identificador en la URL (ver sidebar/historial), aunque la ruta en sí
  // sea siempre "/resultado" — sin esto, abrir un segundo análisis reciente
  // mientras ya estás en /resultado no releía sessionStorage (Next no
  // remonta si el pathname no cambia).
  return (
    <ResultadoContent
      key={searchParams.toString()}
      desdeHistorial={searchParams.get('from') === 'historial'}
    />
  )
}

export default function ResultadoPage() {
  return (
    <Suspense fallback={null}>
      <ResultadoWrapper />
    </Suspense>
  )
}
