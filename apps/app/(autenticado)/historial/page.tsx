'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { RotateCcw, Search, WifiOff } from 'lucide-react'
import { apiFetch, type HistoryItem } from '@/lib/api'
import { guardarResultadoDesdeHistorial } from '@/lib/resultado-storage'
import { CONFIDENCE, normalize, VERDICT, type Verdict } from '@/lib/verdict'
import { cn } from '@/lib/utils'

const FILTROS: Array<{ valor: Verdict | 'todos'; label: string }> = [
  { valor: 'todos', label: 'Todos' },
  { valor: 'verificado', label: 'Verificado' },
  { valor: 'dudoso', label: 'Dudoso' },
  { valor: 'falso', label: 'Falso' },
  { valor: 'sin-datos', label: 'Sin datos' },
]

function hostnameDe(url: string): string {
  try {
    const host = new URL(url).hostname.toLowerCase()
    return host.startsWith('www.') ? host.slice(4) : host
  } catch {
    return url
  }
}

/**
 * Una fila del historial.
 *
 * Es una lista, no una grilla de tarjetas: el historial se escanea de arriba a
 * abajo buscando una nota concreta, y una columna alineada hace eso mucho mejor
 * que tres columnas de cards. El borde izquierdo lleva el color del veredicto —
 * el mismo rol que el borde superior en la card de resultado.
 */
function FilaHistorial({ item }: { item: HistoryItem }) {
  const router = useRouter()
  const { verdict, confidence } = normalize(item.verdict, item.confidence)
  const meta = VERDICT[verdict]
  const Icon = meta.icon

  const abrir = () => {
    guardarResultadoDesdeHistorial(item)
    // El id fuerza el remount de /resultado (ver comentario en esa página) y
    // "from=historial" habilita el botón de volver acá.
    router.push(`/resultado?item=${item.id}&from=historial`)
  }

  return (
    <li>
      <button
        onClick={abrir}
        className={cn(
          'group flex w-full flex-col gap-3 rounded-lg border border-border border-l-[3px] bg-surface',
          'px-5 py-4 text-left transition-colors duration-150 ease-boreal',
          'hover:border-border-strong hover:bg-surface-sunk',
          meta.borderLeft,
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <span className={cn('inline-flex items-center gap-2 font-mono text-micro uppercase', meta.text)}>
            <Icon aria-hidden="true" size={13} strokeWidth={2.25} />
            {meta.label}
          </span>
          <span className="flex items-center gap-2.5 font-mono text-micro uppercase text-subtle">
            <span className="flex h-1.5 w-10 gap-0.5" aria-hidden="true">
              {[1, 2, 3, 4, 5].map((i) => (
                <span
                  key={i}
                  className={cn('flex-1 rounded-pill', i <= confidence ? meta.bg : 'bg-border')}
                />
              ))}
            </span>
            confianza {CONFIDENCE[confidence].label.toLowerCase()}
          </span>
        </div>

        <p className="line-clamp-2 font-display text-body font-semibold leading-snug text-display">
          {item.headline || item.title || item.url}
        </p>

        {item.lead && (
          <p className="line-clamp-2 text-body-sm text-muted">{item.lead}</p>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-micro uppercase text-subtle">
          <time dateTime={item.createdAt}>
            {new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium' }).format(
              new Date(item.createdAt),
            )}
          </time>
          <span className="truncate normal-case tracking-normal">{hostnameDe(item.url)}</span>
          <span>{item.sources.length} fuentes</span>
        </div>
      </button>
    </li>
  )
}

/**
 * El vacío es el estado de trabajo, no un hueco: no hay ilustración triste ni
 * un "aún no hay nada", hay una salida directa a analizar la primera nota.
 */
function VistaVacia({ filtrando }: { filtrando: boolean }) {
  return (
    <div className="card-shell border-t-border">
      <h2 className="font-display text-h3 font-semibold text-display">
        {filtrando ? 'Ninguna nota con ese veredicto' : 'Todavía no analizaste ninguna nota'}
      </h2>
      <p className="text-body-sm text-muted">
        {filtrando
          ? 'Probá con otro veredicto, o mirá el historial completo.'
          : 'Cuando verifiques tu primera nota va a quedar acá, con su veredicto y sus fuentes, para volver a consultarla cuando quieras.'}
      </p>
      {!filtrando && (
        <Link href="/dashboard" className="btn-primary self-start">
          <Search aria-hidden="true" size={16} />
          Verificar la primera
        </Link>
      )}
    </div>
  )
}

function VistaCargando() {
  return (
    <ul className="flex flex-col gap-3" aria-busy="true" aria-label="Cargando historial">
      {Array.from({ length: 5 }).map((_, i) => (
        <li
          key={i}
          className="flex flex-col gap-3 rounded-lg border border-border border-l-[3px] bg-surface px-5 py-4"
        >
          <span className="h-3 w-28 animate-pulse-soft rounded-sm bg-border" />
          <span className="h-4 w-4/5 animate-pulse-soft rounded-sm bg-border" />
          <span className="h-3 w-3/5 animate-pulse-soft rounded-sm bg-border" />
        </li>
      ))}
    </ul>
  )
}

function VistaError({ onReintentar }: { onReintentar: () => void }) {
  return (
    <section role="alert" className="card-shell border-t-verdict-dudoso">
      <p className="chip self-start text-verdict-dudoso">
        <WifiOff aria-hidden="true" size={14} /> Sin conexión
      </p>
      <h2 className="font-display text-h3 font-semibold text-display">
        No pudimos traer tu historial
      </h2>
      <p className="text-body-sm text-muted">
        Se cortó la conexión con el servidor. Tus análisis siguen guardados: probá de nuevo en
        unos segundos.
      </p>
      <button onClick={onReintentar} className="btn-primary self-start">
        <RotateCcw aria-hidden="true" size={16} /> Reintentar
      </button>
    </section>
  )
}

type Estado = 'cargando' | 'error' | 'listo'

export default function HistorialPage() {
  const [estado, setEstado] = useState<Estado>('cargando')
  const [analyses, setAnalyses] = useState<HistoryItem[]>([])
  const [filtro, setFiltro] = useState<Verdict | 'todos'>('todos')

  const cargar = () => {
    setEstado('cargando')
    apiFetch<{ analyses: HistoryItem[] }>('/history')
      .then((res) => {
        setAnalyses(res.analyses)
        setEstado('listo')
      })
      .catch(() => setEstado('error'))
  }

  useEffect(() => {
    cargar()
  }, [])

  const visibles =
    filtro === 'todos'
      ? analyses
      : analyses.filter((a) => normalize(a.verdict, a.confidence).verdict === filtro)

  return (
    <div className="mx-auto flex w-full max-w-card flex-col gap-8 px-gutter py-12 md:px-6 md:py-16">
      <header className="flex flex-col gap-3">
        <p className="eyebrow">Historial</p>
        <h1 className="font-display text-h2-fluid text-display">Lo que ya verificaste</h1>
        <p className="max-w-texto text-muted">
          Cada nota con su veredicto y qué tan sólida era la evidencia. Se abren sin volver a
          analizarlas.
        </p>
      </header>

      {estado === 'listo' && analyses.length > 0 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por veredicto">
          {FILTROS.map((f) => {
            const activo = filtro === f.valor
            return (
              <button
                key={f.valor}
                type="button"
                onClick={() => setFiltro(f.valor)}
                aria-pressed={activo}
                className={cn(
                  'rounded-pill border px-3.5 py-1.5 font-mono text-micro uppercase transition-colors duration-150 ease-boreal',
                  activo
                    ? 'border-accent-text text-accent-text'
                    : 'border-border text-subtle hover:border-border-strong hover:text-ink',
                )}
              >
                {f.label}
                {f.valor !== 'todos' && (
                  <span className="ml-2 text-disabled">
                    {
                      analyses.filter(
                        (a) => normalize(a.verdict, a.confidence).verdict === f.valor,
                      ).length
                    }
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {estado === 'cargando' ? (
        <VistaCargando />
      ) : estado === 'error' ? (
        <VistaError onReintentar={cargar} />
      ) : visibles.length === 0 ? (
        <VistaVacia filtrando={filtro !== 'todos' && analyses.length > 0} />
      ) : (
        <ul className="flex flex-col gap-3">
          {visibles.map((item) => (
            <FilaHistorial key={item.id} item={item} />
          ))}
        </ul>
      )}
    </div>
  )
}
