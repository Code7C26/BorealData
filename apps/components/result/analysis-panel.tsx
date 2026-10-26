'use client'

import { useEffect, useRef } from 'react'
import {
  ClipboardCopy,
  FileWarning,
  Link2,
  Loader2,
  RotateCcw,
  SearchX,
  Sparkles,
  WifiOff,
  type LucideIcon,
} from 'lucide-react'
import { TAG_IDIOMA, traducciones } from '@/lib/idioma'
import { useIdioma, useTextos } from '@/lib/use-idioma'
import { cn } from '@/lib/utils'

/** Tope de caracteres que el motor analiza de una vez (espejo del backend). */
export const MAX_CHARS = 12_000

type ErrorKind = Exclude<AnalysisState, { kind: 'idle' } | { kind: 'loading' }>['kind']

const TEXTOS = traducciones({
  es: {
    /**
     * Los cuatro pasos reales del motor. El loading no es un spinner: son los pasos
     * que de verdad ocurren, marcándose. La espera enseña cómo funciona — es el
     * posicionamiento en acción.
     */
    pasos: [
      'Leímos la nota y extrajimos las afirmaciones',
      'Identificamos las instituciones citadas',
      'Comparamos con fuentes primarias',
      'Revisamos verificadores independientes',
    ],
    analizando: 'Analizando',
    casiListo: 'Casi listo',
    tardando: 'Está tardando más de lo normal. Seguimos.',
    errores: {
      'error-network': { chip: 'Sin conexión', title: 'No pudimos completar el análisis' },
      'error-url': { chip: 'Enlace no válido', title: 'Eso no parece un enlace a una nota' },
      'error-too-long': {
        chip: 'Texto muy largo',
        title: 'Es más largo de lo que podemos analizar de una vez',
      },
      'error-content': { chip: 'Sin contenido', title: 'No pudimos leer el texto de esa nota' },
    } satisfies Record<ErrorKind, { chip: string; title: string }>,
    red: 'Se cortó la conexión mientras consultábamos las fuentes. Guardamos lo que pegaste: probá de nuevo cuando tengas señal.',
    contenido:
      'Llegamos a la página, pero no encontramos el cuerpo de la nota. Suele pasar con muros de pago, con contenido que se carga después, o cuando el enlace lleva a una portada y no a un artículo.',
    url: 'Necesitamos la dirección completa de la publicación. Si la copiaste de una app, puede haber quedado cortada.',
    vacio: '(vacío)',
    muyLargo: (largo: string, limite: string) =>
      `Pegaste ${largo} caracteres y el límite es ${limite}. Podemos analizar los primeros ${limite}, o partilo en dos.`,
    limite: (limite: string) => `límite ${limite}`,
    reintentar: 'Reintentar',
    recuperar: 'Recuperar lo que pegué',
    corregir: 'Corregir el enlace',
    otroEnlace: 'Probar con otro enlace',
    analizarPrimeros: (limite: string) => `Analizar los primeros ${limite}`,
    pie: (codigo: string, intento: number) => `Error ${codigo} · reintento ${intento} de 3`,
  },
  en: {
    pasos: [
      'We read the article and extracted its claims',
      'We identified the institutions it cites',
      'We compared against primary sources',
      'We checked independent fact-checkers',
    ],
    analizando: 'Analyzing',
    casiListo: 'Almost done',
    tardando: "This is taking longer than usual. We're still on it.",
    errores: {
      'error-network': { chip: 'No connection', title: "We couldn't complete the analysis" },
      'error-url': { chip: 'Invalid link', title: "That doesn't look like a link to an article" },
      'error-too-long': {
        chip: 'Text too long',
        title: "It's longer than we can analyze in one go",
      },
      'error-content': { chip: 'No content', title: "We couldn't read the text of that article" },
    },
    red: 'The connection dropped while we were checking the sources. We kept what you pasted: try again once you have signal.',
    contenido:
      "We reached the page, but couldn't find the body of the article. This usually happens with paywalls, content that loads later, or when the link points to a front page rather than an article.",
    url: 'We need the full address of the post. If you copied it from an app, it may have been cut off.',
    vacio: '(empty)',
    muyLargo: (largo: string, limite: string) =>
      `You pasted ${largo} characters and the limit is ${limite}. We can analyze the first ${limite}, or you can split it in two.`,
    limite: (limite: string) => `limit ${limite}`,
    reintentar: 'Try again',
    recuperar: 'Get back what I pasted',
    corregir: 'Fix the link',
    otroEnlace: 'Try another link',
    analizarPrimeros: (limite: string) => `Analyze the first ${limite}`,
    pie: (codigo: string, intento: number) => `Error ${codigo} · attempt ${intento} of 3`,
  },
})

/** Cuántos pasos tiene el motor (los textos van en TEXTOS, en los dos idiomas). */
export const TOTAL_PASOS = TEXTOS.es.pasos.length

export type AnalysisState =
  | { kind: 'idle' }
  | { kind: 'loading'; step: 0 | 1 | 2 | 3; elapsed: number; resuelto: boolean }
  | { kind: 'error-network'; attempt: number; code: string }
  | { kind: 'error-url'; value: string }
  | { kind: 'error-too-long'; length: number }
  /* El scraper llegó a la página pero no encontró una nota adentro (muro de
     pago, contenido cargado por JS, galería sin texto). No es un veredicto:
     es el producto diciendo qué no pudo hacer. */
  | { kind: 'error-content'; value: string }

/** A partir de acá se avisa que está tardando, sin cambiar de estado ni asustar. */
const SEGUNDOS_PARA_AVISAR = 20

/**
 * La máquina de estados de la pantalla de análisis.
 *
 * Cinco estados, todos con la MISMA caja (`.card-shell`): mismo ancho, radio,
 * borde y padding que la card de resultado, para que no haya salto de layout
 * entre estado y resultado. Solo cambian el color del borde superior y el
 * contenido.
 *
 * Regla de sistema sobre el color de los errores: el coral (--falso) está
 * reservado exclusivamente al veredicto del contenido. Un fallo del producto
 * nunca puede parecer un juicio sobre la noticia, así que los tres errores usan
 * ámbar (--dudoso). Vale igual para validaciones de formulario y toasts.
 */
export function AnalysisPanel({
  state,
  onRetry,
  onTruncate,
  onEditar,
  className,
}: {
  state: Exclude<AnalysisState, { kind: 'idle' }>
  onRetry?: () => void
  onTruncate?: () => void
  /** Vuelve al formulario con lo que el usuario había pegado, intacto. */
  onEditar?: () => void
  className?: string
}) {
  const alertRef = useRef<HTMLHeadingElement>(null)

  // Cada card de error es role="alert" y el foco salta al titular.
  useEffect(() => {
    if (state.kind.startsWith('error')) alertRef.current?.focus()
  }, [state.kind])

  if (state.kind === 'loading') return <LoadingCard state={state} className={className} />

  return <ErrorCard state={state} onRetry={onRetry} onTruncate={onTruncate} onEditar={onEditar} alertRef={alertRef} className={className} />
}

function LoadingCard({
  state,
  className,
}: {
  state: Extract<AnalysisState, { kind: 'loading' }>
  className?: string
}) {
  const t = useTextos(TEXTOS)
  // La barra no llega a 100 hasta que el backend contestó de verdad: mostrar el
  // final antes de tiempo hace que la pantalla parezca trabada mientras en
  // realidad sigue esperando. Un artículo largo con búsqueda real tarda bastante
  // más que la animación de cuatro pasos.
  const progreso = state.resuelto ? 100 : Math.min(75, (state.step + 1) * 25)

  return (
    <section
      aria-busy="true"
      aria-labelledby="loading-title"
      className={cn('card-shell border-t-accent', className)}
    >
      <header className="flex flex-wrap items-center justify-between gap-4">
        <p className="chip text-accent-text">
          <Loader2 aria-hidden="true" size={14} className="animate-spin motion-reduce:animate-none" />
          {t.analizando}
        </p>
        <span className="font-mono text-micro uppercase text-subtle">
          {state.resuelto ? t.casiListo : `~${Math.max(2, 8 - state.step * 2)} s`}
        </span>
      </header>

      <h2
        id="loading-title"
        aria-live="polite"
        className="font-display text-h3 font-semibold text-display"
      >
        {t.pasos[state.step]}
      </h2>

      <ol className="flex flex-col gap-3.5">
        {t.pasos.map((label, i) => {
          const hecho = i < state.step || (state.resuelto && i <= state.step)
          const activo = i === state.step && !state.resuelto
          return (
            <li key={i} className="flex items-start gap-3.5 text-body-sm">
              <span
                aria-hidden="true"
                className={cn(
                  'w-5 shrink-0 pt-0.5 font-mono text-caption tracking-normal',
                  hecho
                    ? 'text-verdict-verificado'
                    : activo
                      ? 'text-accent-text'
                      : 'text-disabled',
                )}
              >
                {hecho ? '✓' : String(i + 1).padStart(2, '0')}
              </span>
              <span
                className={cn(
                  hecho
                    ? 'text-muted'
                    : activo
                      ? 'animate-pulse-soft text-ink motion-reduce:animate-none'
                      : 'text-disabled',
                )}
              >
                {label}
              </span>
            </li>
          )
        })}
      </ol>

      <div className="h-2 overflow-hidden rounded-pill bg-border">
        <div
          className="h-full rounded-pill bg-accent transition-[width] duration-500 ease-boreal"
          style={{ width: `${progreso}%` }}
        />
      </div>

      {state.elapsed > SEGUNDOS_PARA_AVISAR && (
        <p className="text-body-sm text-subtle">{t.tardando}</p>
      )}

      {/* Esqueleto de lo que viene: la card no cambia de tamaño al resolverse. */}
      <div aria-hidden="true" className="card-block gap-2.5">
        {['78%', '64%', '40%'].map((w) => (
          <span
            key={w}
            style={{ width: w }}
            className="h-3.5 animate-pulse-soft rounded-sm bg-border motion-reduce:animate-none"
          />
        ))}
      </div>
    </section>
  )
}

/**
 * Todo error dice qué pasó, qué conservamos y qué puede hacer el usuario. Nunca
 * "algo salió mal". El código técnico va en micro al pie, para soporte, sin
 * contaminar el mensaje.
 */
const ICONO_ERROR: Record<ErrorKind, LucideIcon> = {
  'error-network': WifiOff,
  'error-url': Link2,
  'error-too-long': FileWarning,
  'error-content': SearchX,
}

function ErrorCard({
  state,
  onRetry,
  onTruncate,
  onEditar,
  alertRef,
  className,
}: {
  state: Exclude<AnalysisState, { kind: 'idle' } | { kind: 'loading' }>
  onRetry?: () => void
  onTruncate?: () => void
  onEditar?: () => void
  alertRef: React.RefObject<HTMLHeadingElement | null>
  className?: string
}) {
  const t = useTextos(TEXTOS)
  const tag = TAG_IDIOMA[useIdioma().idioma]
  const meta = t.errores[state.kind]
  const ErrIcon = ICONO_ERROR[state.kind]
  const limite = MAX_CHARS.toLocaleString(tag)

  return (
    <section role="alert" className={cn('card-shell border-t-verdict-dudoso', className)}>
      <p className="chip self-start text-verdict-dudoso">
        <ErrIcon aria-hidden="true" size={14} /> {meta.chip}
      </p>

      <h2
        ref={alertRef}
        tabIndex={-1}
        className="font-display text-h3 font-semibold text-display outline-none"
      >
        {meta.title}
      </h2>

      {state.kind === 'error-network' && <p className="text-body-sm text-muted">{t.red}</p>}

      {state.kind === 'error-content' && (
        <>
          <p className="text-body-sm text-muted">{t.contenido}</p>
          <p
            className="truncate rounded-lg bg-surface-sunk px-3.5 py-2.5 font-mono text-caption tracking-normal text-subtle"
            title={state.value}
          >
            {state.value.replace(/^https?:\/\//, '')}
          </p>
        </>
      )}

      {state.kind === 'error-url' && (
        <>
          <p className="text-body-sm text-muted">{t.url}</p>
          <p className="truncate rounded-lg bg-surface-sunk px-3.5 py-2.5 font-mono text-caption tracking-normal text-verdict-dudoso" title={state.value}>
            {state.value || t.vacio}
          </p>
        </>
      )}

      {state.kind === 'error-too-long' && (
        <>
          <p className="text-body-sm text-muted">
            {t.muyLargo(state.length.toLocaleString(tag), limite)}
          </p>
          <div className="flex flex-col gap-2">
            <div className="h-2 overflow-hidden rounded-pill bg-border">
              <div
                className="h-full rounded-pill bg-verdict-dudoso"
                style={{ width: `${Math.min(100, (MAX_CHARS / state.length) * 100)}%` }}
              />
            </div>
            <div className="flex justify-between font-mono text-micro uppercase text-subtle">
              <span>{state.length.toLocaleString(tag)}</span>
              <span>{t.limite(limite)}</span>
            </div>
          </div>
        </>
      )}

      <div className="flex flex-col gap-3 md:flex-row">
        {state.kind === 'error-network' && (
          <>
            {onRetry && (
              <button type="button" onClick={onRetry} className="btn-primary w-full md:w-auto">
                <RotateCcw aria-hidden="true" size={16} /> {t.reintentar}
              </button>
            )}
            {onEditar && (
              <button type="button" onClick={onEditar} className="btn-secondary w-full md:w-auto">
                <ClipboardCopy aria-hidden="true" size={16} /> {t.recuperar}
              </button>
            )}
          </>
        )}

        {state.kind === 'error-url' && onEditar && (
          <button type="button" onClick={onEditar} className="btn-primary w-full md:w-auto">
            <Sparkles aria-hidden="true" size={16} /> {t.corregir}
          </button>
        )}

        {state.kind === 'error-content' && (
          <>
            {onEditar && (
              <button type="button" onClick={onEditar} className="btn-primary w-full md:w-auto">
                {t.otroEnlace}
              </button>
            )}
            {onRetry && (
              <button type="button" onClick={onRetry} className="btn-secondary w-full md:w-auto">
                <RotateCcw aria-hidden="true" size={16} /> {t.reintentar}
              </button>
            )}
          </>
        )}

        {state.kind === 'error-too-long' && onTruncate && (
          <button type="button" onClick={onTruncate} className="btn-primary w-full md:w-auto">
            {t.analizarPrimeros(limite)}
          </button>
        )}
      </div>

      {state.kind === 'error-network' && (
        <p className="font-mono text-micro uppercase text-disabled">
          {t.pie(state.code, state.attempt)}
        </p>
      )}
    </section>
  )
}
