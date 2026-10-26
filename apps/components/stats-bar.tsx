'use client'

import { useEffect, useState } from 'react'
import { apiFetch, type GlobalStats } from '@/lib/api'
import { TAG_IDIOMA, traducciones } from '@/lib/idioma'
import { useIdioma, useTextos } from '@/lib/use-idioma'
import { useVocabulario } from '@/lib/use-vocabulario'
import type { Verdict } from '@/lib/verdict'
import { cn } from '@/lib/utils'

const TEXTOS = traducciones({
  es: {
    titulo: 'Lo que llevamos verificado',
    notasAnalizadas: 'Notas analizadas',
    fuentesConsultadas: 'Fuentes consultadas',
    confianzaMedia: (nivel: string) => `Confianza media — ${nivel}`,
    notas: (n: string) => `${n} notas`,
  },
  en: {
    titulo: "What we've checked so far",
    notasAnalizadas: 'Articles analyzed',
    fuentesConsultadas: 'Sources checked',
    confianzaMedia: (nivel: string) => `Average confidence — ${nivel}`,
    notas: (n: string) => `${n} articles`,
  },
})

const ORDEN: Verdict[] = ['verificado', 'dudoso', 'falso', 'sin-datos']

const DURACION_CONTEO_MS = 1200

/**
 * Los números reales de la plataforma.
 *
 * Antes esta barra mostraba cifras de utilería ("+12.000 noticias", "94 % de
 * precisión"). Una herramienta cuyo argumento es "mirá la evidencia" no puede
 * abrir con datos inventados, así que ahora sale todo de GET /stats — que es
 * público y no necesita sesión. Si el endpoint falla, la sección no se
 * renderiza: mejor no decir nada que decir un número que no medimos.
 */
export function StatsBar() {
  const [stats, setStats] = useState<GlobalStats | null>(null)
  const [progreso, setProgreso] = useState(0)
  const t = useTextos(TEXTOS)
  const tag = TAG_IDIOMA[useIdioma().idioma]
  const { CONFIDENCE, VERDICT } = useVocabulario()

  useEffect(() => {
    apiFetch<GlobalStats>('/stats')
      .then(setStats)
      .catch(() => setStats(null))
  }, [])

  // El conteo arranca recién cuando llegó el dato: animar desde 0 hacia un
  // número que todavía no existe deja el contador clavado en cero.
  useEffect(() => {
    if (!stats) return
    const inicio = performance.now()
    let frame = requestAnimationFrame(function paso(ahora: number) {
      const t = Math.min((ahora - inicio) / DURACION_CONTEO_MS, 1)
      setProgreso(1 - Math.pow(1 - t, 3))
      if (t < 1) frame = requestAnimationFrame(paso)
    })
    return () => cancelAnimationFrame(frame)
  }, [stats])

  if (!stats || stats.totalAnalyses === 0) return null

  const nivelMedio = Math.round(stats.averageConfidence) as 1 | 2 | 3 | 4 | 5

  return (
    <section className="px-gutter pb-32 md:px-6" aria-labelledby="stats-title">
      <div className="mx-auto flex max-w-shell flex-col gap-10 border-y border-border py-16">
        <h2 id="stats-title" className="eyebrow">
          {t.titulo}
        </h2>

        <div className="grid grid-cols-1 gap-10 sm:grid-cols-3 sm:gap-0">
          <Dato
            valor={Math.round(stats.totalAnalyses * progreso).toLocaleString(tag)}
            label={t.notasAnalizadas}
          />
          <Dato
            valor={Math.round(stats.totalSources * progreso).toLocaleString(tag)}
            label={t.fuentesConsultadas}
          />
          <Dato
            valor={`${stats.averageConfidence.toLocaleString(tag)} / 5`}
            label={t.confianzaMedia(CONFIDENCE[nivelMedio].label.toLowerCase())}
            ultimo
          />
        </div>

        {/* El reparto por veredicto: los cuatro estados con su color y su cifra.
            Es la prueba de que no hay un sesgo hacia "falso". */}
        <dl className="grid grid-cols-2 gap-x-6 gap-y-6 lg:grid-cols-4">
          {ORDEN.map((v) => {
            const meta = VERDICT[v]
            const n = stats.verdicts[v] ?? 0
            const pct = stats.totalAnalyses > 0 ? (n / stats.totalAnalyses) * 100 : 0
            return (
              <div key={v} className="flex flex-col gap-2.5">
                <div className="h-2 overflow-hidden rounded-pill bg-border">
                  <div
                    className={cn('h-full rounded-pill transition-[width] duration-700 ease-boreal', meta.bg)}
                    style={{ width: `${pct * progreso}%` }}
                  />
                </div>
                <dt className={cn('font-mono text-micro uppercase', meta.text)}>{meta.label}</dt>
                <dd className="font-mono text-caption tracking-normal text-subtle">
                  {t.notas(n.toLocaleString(tag))}
                </dd>
              </div>
            )
          })}
        </dl>
      </div>
    </section>
  )
}

function Dato({ valor, label, ultimo }: { valor: string; label: string; ultimo?: boolean }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 text-center',
        !ultimo && 'sm:border-r sm:border-border',
      )}
    >
      <span className="font-display text-[clamp(2.5rem,5vw,3.5rem)] leading-none font-bold tracking-[-0.03em] text-display">
        {valor}
      </span>
      <span className="font-mono text-micro uppercase text-subtle">{label}</span>
    </div>
  )
}
