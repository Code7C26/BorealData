'use client'

import { useEffect, useState } from 'react'
import { ArrowUpRight, PanelRight } from 'lucide-react'
import { AnalisisInput } from '@/components/analisis-input'
import { AuroraBoreal } from '@/components/aurora-boreal'
import { apiFetch, type GlobalStats } from '@/lib/api'
import { CHROME_EXTENSION_URL } from '@/lib/extension'
import { TAG_IDIOMA, traducciones } from '@/lib/idioma'
import { useIdioma, useTextos } from '@/lib/use-idioma'
import { useVocabulario } from '@/lib/use-vocabulario'
import type { Verdict } from '@/lib/verdict'
import { cn } from '@/lib/utils'

const ORDEN_VEREDICTOS: Verdict[] = ['verificado', 'dudoso', 'falso', 'sin-datos']

const TEXTOS = traducciones({
  es: {
    eyebrow: 'Verificar una nota',
    titulo: 'Mostramos el camino, no un puntaje.',
    bajada:
      'Pegá el enlace y te devolvemos el veredicto, qué tan sólida es la evidencia, las fuentes que consultamos —con su postura, incluso las que contradicen— y cómo lo razonamos.',
    hastaHoy: 'En AletheIA hasta hoy',
    resumen: (notas: string, fuentes: string, confianza: string) =>
      `${notas} notas · ${fuentes} fuentes · confianza media ${confianza} de 5`,
    extEyebrow: 'Extensión de Chrome',
    extTitulo: 'Verificá sin salir de la nota',
    extBajada:
      'Instalá AletheIA en Chrome y abrí el análisis en un panel al costado de la página que estás leyendo. Usa esta misma cuenta: no tenés que volver a iniciar sesión.',
    extBoton: 'Agregar a Chrome',
  },
  en: {
    eyebrow: 'Check an article',
    titulo: 'We show the path, not a score.',
    bajada:
      'Paste the link and we give you back the verdict, how solid the evidence is, the sources we checked —with where each one stands, even the ones that contradict it— and how we reasoned it.',
    hastaHoy: 'On AletheIA so far',
    resumen: (notas: string, fuentes: string, confianza: string) =>
      `${notas} articles · ${fuentes} sources · average confidence ${confianza} out of 5`,
    extEyebrow: 'Chrome extension',
    extTitulo: 'Check without leaving the article',
    extBajada:
      "Install AletheIA in Chrome and open the analysis in a panel next to the page you're reading. It uses this same account: no need to sign in again.",
    extBoton: 'Add to Chrome',
  },
})

export default function DashboardPage() {
  const [stats, setStats] = useState<GlobalStats | null>(null)
  const t = useTextos(TEXTOS)

  // Totales globales de la plataforma (no del usuario ni del día). Si /stats falla se
  // quedan en null y los bloques muestran el placeholder: es info secundaria, no vale
  // la pena romper el dashboard por esto.
  useEffect(() => {
    apiFetch<GlobalStats>('/stats')
      .then(setStats)
      .catch(() => {})
  }, [])

  return (
    <div className="relative isolate min-h-screen overflow-hidden">
      <AuroraBoreal discreta />

      <div className="mx-auto flex w-full max-w-card flex-col gap-12 px-gutter py-12 md:px-6 md:py-16">
        <header className="flex flex-col gap-4">
          <p className="eyebrow">{t.eyebrow}</p>
          <h1 className="font-display text-h2-fluid text-display">{t.titulo}</h1>
          <p className="max-w-texto text-muted">{t.bajada}</p>
        </header>

        <AnalisisInput />

        <ExtensionCard />

        <RepartoDeVeredictos stats={stats} />
      </div>
    </div>
  )
}

/**
 * Invitación a instalar la extensión, justo debajo del input. Si se llega con
 * #extension (registro desde la sección de la extensión de la landing), se scrollea
 * hasta acá: el bloque se monta después de que el navegador intenta saltar al ancla.
 */
function ExtensionCard() {
  const t = useTextos(TEXTOS)

  useEffect(() => {
    if (window.location.hash === '#extension') {
      document.getElementById('extension')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [])

  return (
    <section
      id="extension"
      aria-labelledby="extension-title"
      className="flex scroll-mt-24 flex-col gap-5 rounded-2xl border border-border bg-surface p-6 md:flex-row md:items-center md:justify-between md:p-8"
    >
      <div className="flex items-start gap-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-sunk text-accent-text">
          <PanelRight aria-hidden="true" size={18} />
        </span>
        <div className="flex flex-col gap-1.5">
          <p className="eyebrow">{t.extEyebrow}</p>
          <h2 id="extension-title" className="font-display text-h3 font-semibold text-display">
            {t.extTitulo}
          </h2>
          <p className="max-w-texto text-body-sm text-muted">{t.extBajada}</p>
        </div>
      </div>
      <a
        href={CHROME_EXTENSION_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-primary shrink-0 self-start md:self-center"
      >
        {t.extBoton}
        <ArrowUpRight aria-hidden="true" size={16} />
      </a>
    </section>
  )
}

/**
 * Los números de la plataforma entera, desde siempre.
 *
 * Antes había un bloque de "confiabilidad promedio" en porcentaje. Se cayó con
 * el score: promediar veredictos no da un porcentaje que signifique algo. En su
 * lugar va el reparto real de los cuatro estados, que además explica el
 * vocabulario del producto a quien recién llega.
 */
function RepartoDeVeredictos({ stats }: { stats: GlobalStats | null }) {
  const total = stats?.totalAnalyses ?? 0
  const t = useTextos(TEXTOS)
  const tag = TAG_IDIOMA[useIdioma().idioma]
  const { VERDICT } = useVocabulario()

  return (
    <section className="flex flex-col gap-6" aria-labelledby="stats-title">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h2 id="stats-title" className="font-mono text-caption uppercase text-subtle">
          {t.hastaHoy}
        </h2>
        <p className="font-mono text-caption text-subtle">
          {stats ? (
            t.resumen(
              stats.totalAnalyses.toLocaleString(tag),
              stats.totalSources.toLocaleString(tag),
              stats.averageConfidence.toLocaleString(tag),
            )
          ) : (
            <span className="inline-block h-3 w-48 animate-pulse-soft rounded-sm bg-border align-middle" />
          )}
        </p>
      </div>

      {/* Una sola barra apilada: el reparto se lee de un vistazo y los cuatro
          colores quedan asociados a su etiqueta sin una leyenda aparte. */}
      <div className="flex h-2 gap-1 overflow-hidden rounded-pill" aria-hidden="true">
        {stats && total > 0 ? (
          ORDEN_VEREDICTOS.map((v) => {
            const n = stats.verdicts[v] ?? 0
            if (n === 0) return null
            return (
              <span
                key={v}
                className={cn('rounded-pill', VERDICT[v].bg)}
                style={{ width: `${(n / total) * 100}%` }}
              />
            )
          })
        ) : (
          <span className="w-full animate-pulse-soft rounded-pill bg-border" />
        )}
      </div>

      <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {ORDEN_VEREDICTOS.map((v) => {
          const meta = VERDICT[v]
          const n = stats?.verdicts[v] ?? null
          return (
            <div key={v} className="flex flex-col gap-2 border-t border-border pt-4">
              <dt className={cn('flex items-center gap-2 font-mono text-micro uppercase', meta.text)}>
                <span className={cn('size-2 shrink-0 rounded-sm', meta.bg)} aria-hidden="true" />
                {meta.label}
              </dt>
              <dd className="font-display text-[1.5rem] leading-none font-semibold text-display">
                {n === null ? (
                  <span className="inline-block h-6 w-12 animate-pulse-soft rounded-sm bg-border align-middle" />
                ) : (
                  n.toLocaleString(tag)
                )}
              </dd>
              <p className="text-caption tracking-normal text-subtle">{meta.meaning}</p>
            </div>
          )
        })}
      </dl>
    </section>
  )
}
