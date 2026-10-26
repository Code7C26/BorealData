'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { RotateCcw, Search, SearchX, Trash2, WifiOff, X } from 'lucide-react'
import { apiFetch, type HistoryItem } from '@/lib/api'
import { mensajeDeError } from '@/lib/errores-api'
import { TAG_IDIOMA, traducciones } from '@/lib/idioma'
import { useIdioma, useTextos } from '@/lib/use-idioma'
import { useVocabulario } from '@/lib/use-vocabulario'
import { normalize, type Verdict } from '@/lib/verdict'
import { cn } from '@/lib/utils'

const FILTROS: Array<Verdict | 'todos'> = ['todos', 'verificado', 'dudoso', 'falso', 'sin-datos']

const TEXTOS = traducciones({
  es: {
    /** Más cortos que las etiquetas del chip: entran en una fila de botones. */
    filtros: {
      todos: 'Todos',
      verificado: 'Verificado',
      dudoso: 'Dudoso',
      falso: 'Falso',
      'sin-datos': 'Sin datos',
    } satisfies Record<Verdict | 'todos', string>,
    confianza: (nivel: string) => `confianza ${nivel}`,
    fuentes: (n: number) => `${n} fuentes`,
    confirmarBorrado: 'Confirmar borrado de este análisis',
    borrar: 'Borrar este análisis',
    vacioFiltrando: 'Ninguna nota con esos criterios',
    vacio: 'Todavía no analizaste ninguna nota',
    vacioFiltrandoBajada:
      'Probá con otro veredicto, cambiá la búsqueda, o mirá el historial completo.',
    vacioBajada:
      'Cuando verifiques tu primera nota va a quedar acá, con su veredicto y sus fuentes, para volver a consultarla cuando quieras.',
    primera: 'Verificar la primera',
    buscar: 'Buscar en tu historial',
    limpiar: 'Limpiar la búsqueda',
    cargando: 'Cargando historial',
    sinConexion: 'Sin conexión',
    noPudimosTraer: 'No pudimos traer tu historial',
    noPudimosTraerBajada:
      'Se cortó la conexión con el servidor. Tus análisis siguen guardados: probá de nuevo en unos segundos.',
    reintentar: 'Reintentar',
    noPudimosBorrar: 'No pudimos borrarlo. Probá de nuevo en unos segundos.',
    eyebrow: 'Historial',
    titulo: 'Lo que ya verificaste',
    bajada:
      'Cada nota con su veredicto y qué tan sólida era la evidencia. Se abren sin volver a analizarlas.',
    filtrar: 'Filtrar por veredicto',
    deTotal: (visibles: number, total: number) => `${visibles} de ${total}`,
  },
  en: {
    filtros: {
      todos: 'All',
      verificado: 'Verified',
      dudoso: 'Questionable',
      falso: 'False',
      'sin-datos': 'No data',
    },
    confianza: (nivel: string) => `${nivel} confidence`,
    fuentes: (n: number) => `${n} sources`,
    confirmarBorrado: 'Confirm deleting this analysis',
    borrar: 'Delete this analysis',
    vacioFiltrando: 'No articles match those filters',
    vacio: "You haven't analyzed any articles yet",
    vacioFiltrandoBajada: 'Try another verdict, change the search, or look at your full history.',
    vacioBajada:
      "When you check your first article it will stay here, with its verdict and sources, so you can come back to it whenever you want.",
    primera: 'Check your first one',
    buscar: 'Search your history',
    limpiar: 'Clear the search',
    cargando: 'Loading history',
    sinConexion: 'No connection',
    noPudimosTraer: "We couldn't load your history",
    noPudimosTraerBajada:
      'The connection to the server dropped. Your analyses are still saved: try again in a few seconds.',
    reintentar: 'Try again',
    noPudimosBorrar: "We couldn't delete it. Try again in a few seconds.",
    eyebrow: 'History',
    titulo: "What you've already checked",
    bajada:
      'Each article with its verdict and how solid the evidence was. They open without being analyzed again.',
    filtrar: 'Filter by verdict',
    deTotal: (visibles: number, total: number) => `${visibles} of ${total}`,
  },
})

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
 *
 * Es un `<a>` y no un `<button>`: desde el 8-oct-2026 cada análisis tiene su propia URL
 * (`/resultado/:id`), así que la fila puede ser un enlace de verdad — se abre en otra
 * pestaña con el clic del medio, se copia con clic derecho, y el navegador la marca como
 * visitada. Antes guardaba el item en sessionStorage y navegaba por JS a `/resultado`,
 * que no se podía ni recargar.
 */
function FilaHistorial({ item, onBorrar }: { item: HistoryItem; onBorrar: () => void }) {
  const t = useTextos(TEXTOS)
  const { idioma } = useIdioma()
  const { CONFIDENCE, VERDICT } = useVocabulario()
  const { verdict, confidence } = normalize(item.verdict, item.confidence)
  const meta = VERDICT[verdict]
  const Icon = meta.icon

  return (
    <li className="relative">
      {/* El botón de borrar va por fuera del enlace: un botón adentro de un <a> no es
          HTML válido y el clic se lo come la navegación. */}
      <BotonBorrarFila onBorrar={onBorrar} />
      <Link
        href={`/resultado/${item.id}`}
        className={cn(
          'group flex w-full flex-col gap-3 rounded-lg border border-border border-l-[3px] bg-surface',
          'px-5 py-4 pr-14 text-left transition-colors duration-150 ease-boreal',
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
            {t.confianza(CONFIDENCE[confidence].label.toLowerCase())}
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
            {new Intl.DateTimeFormat(TAG_IDIOMA[idioma], { dateStyle: 'medium' }).format(
              new Date(item.createdAt),
            )}
          </time>
          {/* Un análisis de imagen subida desde el dashboard no tiene página de origen:
              ahí no va un hueco entre la fecha y las fuentes, va nada. */}
          {hostnameDe(item.url) && (
            <span className="truncate normal-case tracking-normal">{hostnameDe(item.url)}</span>
          )}
          <span>{t.fuentes(item.sources.length)}</span>
        </div>
      </Link>
    </li>
  )
}

/**
 * Borrar una fila. Dos clics, el segundo sobre un ícono que ya cambió de color: es
 * irreversible y no hay "deshacer", pero tampoco amerita un diálogo que corte el
 * escaneo de la lista.
 */
function BotonBorrarFila({ onBorrar }: { onBorrar: () => void }) {
  const [confirmando, setConfirmando] = useState(false)
  const t = useTextos(TEXTOS)

  // Si no confirmó en unos segundos, vuelve a su estado normal: un botón de borrar
  // armado y olvidado en una lista es una trampa para el clic siguiente.
  useEffect(() => {
    if (!confirmando) return
    const id = setTimeout(() => setConfirmando(false), 4000)
    return () => clearTimeout(id)
  }, [confirmando])

  return (
    <button
      type="button"
      onClick={() => (confirmando ? onBorrar() : setConfirmando(true))}
      aria-label={confirmando ? t.confirmarBorrado : t.borrar}
      className={cn(
        'absolute right-3 top-3 z-10 flex size-9 items-center justify-center rounded-pill border',
        'transition-colors duration-150 ease-boreal',
        confirmando
          ? 'border-verdict-falso/50 bg-verdict-falso/10 text-verdict-falso'
          : 'border-transparent text-disabled hover:border-border hover:text-subtle',
      )}
    >
      <Trash2 aria-hidden="true" size={15} />
    </button>
  )
}

/**
 * El vacío es el estado de trabajo, no un hueco: no hay ilustración triste ni
 * un "aún no hay nada", hay una salida directa a analizar la primera nota.
 */
function VistaVacia({ filtrando }: { filtrando: boolean }) {
  const t = useTextos(TEXTOS)

  return (
    <div className="card-shell border-t-border">
      <h2 className="font-display text-h3 font-semibold text-display">
        {filtrando ? t.vacioFiltrando : t.vacio}
      </h2>
      <p className="text-body-sm text-muted">
        {filtrando ? t.vacioFiltrandoBajada : t.vacioBajada}
      </p>
      {!filtrando && (
        <Link href="/dashboard" className="btn-primary self-start">
          <Search aria-hidden="true" size={16} />
          {t.primera}
        </Link>
      )}
    </div>
  )
}

/**
 * Buscar dentro del historial.
 *
 * Filtra en memoria, sobre los análisis que ya están cargados, y no contra el backend:
 * el historial que se trae son las últimas 20 filas, así que una búsqueda server-side
 * sería un endpoint nuevo para un conjunto que ya está en la página. Si algún día el
 * historial pagina de verdad, esto tiene que pasar a `GET /history?q=`.
 *
 * Busca en el titular, el título de la nota, la bajada y el dominio: los cuatro campos
 * por los que alguien se acuerda de una nota que vio.
 */
function CampoBusqueda({ valor, onChange }: { valor: string; onChange: (v: string) => void }) {
  const t = useTextos(TEXTOS)

  return (
    <div className="relative">
      <Search
        aria-hidden="true"
        size={16}
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-disabled"
      />
      <input
        type="search"
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t.buscar}
        aria-label={t.buscar}
        className="field-input w-full pl-10 pr-10 text-body-sm"
      />
      {valor.length > 0 && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label={t.limpiar}
          className="absolute right-3 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-pill text-disabled transition-colors duration-150 hover:text-ink"
        >
          <X aria-hidden="true" size={15} />
        </button>
      )}
    </div>
  )
}

/** ¿Este análisis coincide con lo que se buscó? Sin acentos y sin distinguir mayúsculas. */
function coincide(item: HistoryItem, consulta: string): boolean {
  const normalizar = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')

  const aguja = normalizar(consulta)
  return [item.headline, item.title, item.lead, item.url]
    .filter((campo): campo is string => typeof campo === 'string' && campo.length > 0)
    .some((campo) => normalizar(campo).includes(aguja))
}

function VistaCargando() {
  const t = useTextos(TEXTOS)

  return (
    <ul className="flex flex-col gap-3" aria-busy="true" aria-label={t.cargando}>
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
  const t = useTextos(TEXTOS)

  return (
    <section role="alert" className="card-shell border-t-verdict-dudoso">
      <p className="chip self-start text-verdict-dudoso">
        <WifiOff aria-hidden="true" size={14} /> {t.sinConexion}
      </p>
      <h2 className="font-display text-h3 font-semibold text-display">{t.noPudimosTraer}</h2>
      <p className="text-body-sm text-muted">{t.noPudimosTraerBajada}</p>
      <button onClick={onReintentar} className="btn-primary self-start">
        <RotateCcw aria-hidden="true" size={16} /> {t.reintentar}
      </button>
    </section>
  )
}

type Estado = 'cargando' | 'error' | 'listo'

export default function HistorialPage() {
  const t = useTextos(TEXTOS)
  const { idioma } = useIdioma()
  const [estado, setEstado] = useState<Estado>('cargando')
  const [analyses, setAnalyses] = useState<HistoryItem[]>([])
  const [filtro, setFiltro] = useState<Verdict | 'todos'>('todos')
  const [consulta, setConsulta] = useState('')
  const [errorBorrado, setErrorBorrado] = useState<string | null>(null)

  const pedirHistorial = () => {
    apiFetch<{ analyses: HistoryItem[] }>('/history')
      .then((res) => {
        setAnalyses(res.analyses)
        setEstado('listo')
      })
      .catch(() => setEstado('error'))
  }

  /** Reintentar: acá sí hay que volver a 'cargando', porque se sale de 'error'. */
  const cargar = () => {
    setEstado('cargando')
    pedirHistorial()
  }

  // El efecto solo dispara el pedido. El `setEstado('cargando')` que tenía antes era
  // redundante —ese ya es el estado inicial— y es lo que lo convertía en un setState
  // síncrono dentro de un efecto.
  useEffect(() => {
    pedirHistorial()
  }, [])

  /**
   * Se saca de la lista al toque y se le pega al backend después: borrar algo que ya no
   * querés ver no tiene por qué hacerte esperar. Si falla, la fila vuelve y se avisa —
   * la lista local nunca queda mintiendo.
   */
  const borrar = (item: HistoryItem) => {
    setErrorBorrado(null)
    setAnalyses((previos) => previos.filter((a) => a.id !== item.id))

    apiFetch(`/analyses/${item.id}`, { method: 'DELETE' }).catch((err) => {
      setAnalyses((previos) =>
        previos.some((a) => a.id === item.id)
          ? previos
          : // Se repone en su lugar original, no al final: la lista está ordenada por fecha.
            [...previos, item].sort(
              (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
            ),
      )
      setErrorBorrado(mensajeDeError(err, idioma, t.noPudimosBorrar))
    })
  }

  const visibles = useMemo(() => {
    const porVeredicto =
      filtro === 'todos'
        ? analyses
        : analyses.filter((a) => normalize(a.verdict, a.confidence).verdict === filtro)

    const aguja = consulta.trim()
    return aguja.length === 0
      ? porVeredicto
      : porVeredicto.filter((a) => coincide(a, aguja))
  }, [analyses, filtro, consulta])

  const filtrando = (filtro !== 'todos' || consulta.trim().length > 0) && analyses.length > 0

  return (
    <div className="mx-auto flex w-full max-w-card flex-col gap-8 px-gutter py-12 md:px-6 md:py-16">
      <header className="flex flex-col gap-3">
        <p className="eyebrow">{t.eyebrow}</p>
        <h1 className="font-display text-h2-fluid text-display">{t.titulo}</h1>
        <p className="max-w-texto text-muted">{t.bajada}</p>
      </header>

      {estado === 'listo' && analyses.length > 0 && (
        <CampoBusqueda valor={consulta} onChange={setConsulta} />
      )}

      {estado === 'listo' && analyses.length > 0 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label={t.filtrar}>
          {FILTROS.map((valor) => {
            const activo = filtro === valor
            return (
              <button
                key={valor}
                type="button"
                onClick={() => setFiltro(valor)}
                aria-pressed={activo}
                className={cn(
                  'rounded-pill border px-3.5 py-1.5 font-mono text-micro uppercase transition-colors duration-150 ease-boreal',
                  activo
                    ? 'border-accent-text text-accent-text'
                    : 'border-border text-subtle hover:border-border-strong hover:text-ink',
                )}
              >
                {t.filtros[valor]}
                {valor !== 'todos' && (
                  <span className="ml-2 text-disabled">
                    {
                      analyses.filter(
                        (a) => normalize(a.verdict, a.confidence).verdict === valor,
                      ).length
                    }
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {errorBorrado && (
        <p
          role="alert"
          className="rounded-lg border border-verdict-falso/30 bg-verdict-falso/10 p-3.5 text-caption tracking-normal text-verdict-falso"
        >
          {errorBorrado}
        </p>
      )}

      {estado === 'cargando' ? (
        <VistaCargando />
      ) : estado === 'error' ? (
        <VistaError onReintentar={cargar} />
      ) : visibles.length === 0 ? (
        <VistaVacia filtrando={filtrando} />
      ) : (
        <>
          {filtrando && (
            <p className="flex items-center gap-2 font-mono text-micro uppercase text-subtle">
              <SearchX aria-hidden="true" size={13} />
              {t.deTotal(visibles.length, analyses.length)}
            </p>
          )}
          <ul className="flex flex-col gap-3">
            {visibles.map((item) => (
              <FilaHistorial key={item.id} item={item} onBorrar={() => borrar(item)} />
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
