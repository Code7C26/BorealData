'use client'

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Crop, Maximize2, ScanText, X } from 'lucide-react'
import { RECORTE_COMPLETO, type Recorte } from '@/lib/imagen'
import { cn } from '@/lib/utils'

/**
 * "Esto es lo que vamos a leer": la imagen, con un marco que se ajusta antes de
 * mandarla.
 *
 * El recorte no es cosmético. Una captura de pantalla de un feed trae seis
 * posteos: sin recortar, el modelo lee un collage y el veredicto no vale nada.
 * Es, además, la pantalla de consentimiento — se ve exactamente lo que se va a
 * mandar, antes de que se mande.
 *
 * Es el gemelo de apps/extension/entrypoints/sidepanel/CropPreview.tsx. Misma
 * interacción, distinto sistema de estilos (acá Tailwind, allá CSS plano).
 */

interface RecorteImagenProps {
  /** Object URL de la imagen elegida. */
  src: string
  /** Nombre del archivo o "captura pegada", para el pie. */
  etiqueta: string
  onConfirmar: (recorte: Recorte) => void
  onCancelar: () => void
  className?: string
}

/**
 * Lado mínimo del marco, en fracción de la imagen. Las agarraderas miden 22 px:
 * más chico que esto y se pisan entre sí, además de que no alcanza para que el
 * modelo lea nada.
 */
const MIN_LADO = 0.1

type Esquina = 'nw' | 'ne' | 'sw' | 'se'

/** Qué se está arrastrando. `nuevo` es el marco que se dibuja desde cero. */
type Arrastre =
  | { modo: 'mover'; desdeX: number; desdeY: number; inicial: Recorte }
  | { modo: 'redimensionar'; esquina: Esquina; inicial: Recorte }
  | { modo: 'nuevo'; anclaX: number; anclaY: number }

function clamp01(valor: number): number {
  return Math.min(1, Math.max(0, valor))
}

/** Clases por esquina, escritas enteras: Tailwind v4 no genera clases armadas en runtime. */
const ESQUINAS: { id: Esquina; posicion: string; cubo: string; cursor: string }[] = [
  { id: 'nw', posicion: 'top-0 left-0', cubo: 'top-0.5 left-0.5', cursor: 'cursor-nwse-resize' },
  { id: 'ne', posicion: 'top-0 right-0', cubo: 'top-0.5 right-0.5', cursor: 'cursor-nesw-resize' },
  { id: 'sw', posicion: 'bottom-0 left-0', cubo: 'bottom-0.5 left-0.5', cursor: 'cursor-nesw-resize' },
  { id: 'se', posicion: 'bottom-0 right-0', cubo: 'bottom-0.5 right-0.5', cursor: 'cursor-nwse-resize' },
]

export function RecorteImagen({
  src,
  etiqueta,
  onConfirmar,
  onCancelar,
  className,
}: RecorteImagenProps) {
  const [recorte, setRecorte] = useState<Recorte>(RECORTE_COMPLETO)
  // Tamaño real en píxeles: solo para mostrar cuánto se está mandando.
  const [natural, setNatural] = useState<{ width: number; height: number } | null>(null)
  const contenedorRef = useRef<HTMLDivElement>(null)
  const arrastreRef = useRef<Arrastre | null>(null)

  /** Posición del puntero en fracción del contenedor (0 a 1). */
  const aFraccion = useCallback((e: { clientX: number; clientY: number }) => {
    const rect = contenedorRef.current?.getBoundingClientRect()
    if (!rect || rect.width === 0 || rect.height === 0) return { x: 0, y: 0 }
    return {
      x: clamp01((e.clientX - rect.left) / rect.width),
      y: clamp01((e.clientY - rect.top) / rect.height),
    }
  }, [])

  const alMover = useCallback(
    (e: PointerEvent) => {
      const arrastre = arrastreRef.current
      if (!arrastre) return
      const { x, y } = aFraccion(e)

      if (arrastre.modo === 'nuevo') {
        // El ancla queda fija y el vértice opuesto sigue al puntero, en
        // cualquier dirección.
        setRecorte({
          x: Math.min(arrastre.anclaX, x),
          y: Math.min(arrastre.anclaY, y),
          width: Math.abs(x - arrastre.anclaX),
          height: Math.abs(y - arrastre.anclaY),
        })
        return
      }

      if (arrastre.modo === 'mover') {
        const { inicial, desdeX, desdeY } = arrastre
        // El marco no se deforma al moverlo: se frena contra los bordes.
        setRecorte({
          ...inicial,
          x: Math.min(Math.max(0, inicial.x + (x - desdeX)), 1 - inicial.width),
          y: Math.min(Math.max(0, inicial.y + (y - desdeY)), 1 - inicial.height),
        })
        return
      }

      // Redimensionar: la esquina opuesta a la que se agarró queda clavada.
      const { inicial, esquina } = arrastre
      const izquierda = esquina === 'nw' || esquina === 'sw'
      const arriba = esquina === 'nw' || esquina === 'ne'
      const fijoX = izquierda ? inicial.x + inicial.width : inicial.x
      const fijoY = arriba ? inicial.y + inicial.height : inicial.y

      setRecorte({
        x: Math.min(x, fijoX),
        y: Math.min(y, fijoY),
        width: Math.abs(x - fijoX),
        height: Math.abs(y - fijoY),
      })
    },
    [aFraccion],
  )

  /**
   * Cómo desengancharse de los listeners del arrastre en curso.
   *
   * Vive en un ref y no adentro de `alSoltar`: si `alSoltar` se quitara a sí
   * mismo tendría que nombrarse dentro de su propia definición. Funciona (para
   * cuando corre ya está inicializado), pero es una referencia circular que el
   * linter marca con razón, y basta un refactor para que deje de funcionar.
   */
  const soltarListenersRef = useRef<(() => void) | null>(null)

  const alSoltar = useCallback(() => {
    soltarListenersRef.current?.()
    soltarListenersRef.current = null
    arrastreRef.current = null
    // Un marco diminuto (un clic sin arrastrar) se descarta en vez de dejarlo.
    setRecorte((actual) =>
      actual.width < MIN_LADO || actual.height < MIN_LADO ? RECORTE_COMPLETO : actual,
    )
  }, [])

  /**
   * Los listeners van en `window` y no en el contenedor porque el puntero se
   * sale del marco a mitad del arrastre todo el tiempo: con listeners locales,
   * el gesto se corta justo cuando se llega al borde.
   */
  const iniciarArrastre = (arrastre: Arrastre) => {
    arrastreRef.current = arrastre
    window.addEventListener('pointermove', alMover)
    window.addEventListener('pointerup', alSoltar)
    soltarListenersRef.current = () => {
      window.removeEventListener('pointermove', alMover)
      window.removeEventListener('pointerup', alSoltar)
    }
  }

  // Si el componente se desmonta a mitad de un arrastre (se cancela la imagen
  // sin soltar el botón), los listeners quedarían colgados de window.
  useEffect(() => () => soltarListenersRef.current?.(), [])

  const alApoyarEnImagen = (e: ReactPointerEvent<HTMLDivElement>) => {
    const { x, y } = aFraccion(e)
    setRecorte({ x, y, width: 0, height: 0 })
    iniciarArrastre({ modo: 'nuevo', anclaX: x, anclaY: y })
  }

  const alApoyarEnMarco = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.stopPropagation()
    const { x, y } = aFraccion(e)
    iniciarArrastre({ modo: 'mover', desdeX: x, desdeY: y, inicial: recorte })
  }

  const recorteCompleto = recorte.width > 0.995 && recorte.height > 0.995
  const pxAncho = natural ? Math.round(recorte.width * natural.width) : null
  const pxAlto = natural ? Math.round(recorte.height * natural.height) : null

  return (
    <section className={cn('card-shell border-t-border', className)} aria-labelledby="recorte-title">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="flex items-center gap-2 font-mono text-micro uppercase text-accent-text">
            <Crop aria-hidden="true" size={13} />
            Esto es lo que vamos a leer
          </p>
          <h2 id="recorte-title" className="font-display text-h3 font-semibold text-display">
            {recorteCompleto ? 'Quedate solo con la publicación' : 'Ajustá el recorte'}
          </h2>
        </div>
        <button
          type="button"
          onClick={onCancelar}
          aria-label="Descartar esta imagen"
          className="rounded-pill border border-border p-2 text-subtle transition-colors duration-150 hover:border-border-strong hover:text-ink"
        >
          <X aria-hidden="true" size={16} />
        </button>
      </div>

      <p className="text-body-sm text-muted">
        {recorteCompleto
          ? 'Arrastrá sobre la imagen para marcar solo la publicación. Si hay varios posteos a la vista, recortar cambia el veredicto.'
          : 'Movelo, o estiralo de las esquinas. Hacé clic en el fondo para empezar de nuevo.'}
      </p>

      {/* touch-action-none: sin eso, arrastrar con el dedo scrollea la página
          en vez de mover el marco. overflow-hidden recorta el velo del marco. */}
      <div
        ref={contenedorRef}
        onPointerDown={alApoyarEnImagen}
        role="presentation"
        className="relative cursor-crosshair touch-none overflow-hidden rounded-lg border border-border-strong bg-noche-900 leading-none select-none"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- es un object URL
            local, no una imagen remota: next/image no aporta nada y necesita
            dimensiones que recién se conocen al cargarla. */}
        <img
          src={src}
          alt={`Imagen a analizar: ${etiqueta}`}
          draggable={false}
          onLoad={(e) =>
            setNatural({
              width: e.currentTarget.naturalWidth,
              height: e.currentTarget.naturalHeight,
            })
          }
          className="block h-auto w-full"
        />

        {/* Dos capas en una sola sombra: el aro del marco hacia adentro, y el
            velo sobre todo lo que queda afuera. El aro va `inset` porque un
            outline se dibuja por fuera y el overflow-hidden lo cortaría justo
            cuando el marco toca el borde. */}
        <div
          onPointerDown={alApoyarEnMarco}
          role="presentation"
          className="absolute cursor-move shadow-[inset_0_0_0_1.5px_var(--color-luz),0_0_0_9999px_rgba(5,8,8,0.66)]"
          style={{
            left: `${recorte.x * 100}%`,
            top: `${recorte.y * 100}%`,
            width: `${recorte.width * 100}%`,
            height: `${recorte.height * 100}%`,
          }}
        >
          {/* Las agarraderas van por DENTRO del marco: con offset negativo, el
              overflow-hidden del contenedor las corta al medio justo en el
              estado inicial, cuando las cuatro están contra el borde. */}
          {ESQUINAS.map(({ id, posicion, cubo, cursor }) => (
            <button
              key={id}
              type="button"
              tabIndex={-1}
              aria-label={`Ajustar la esquina ${id}`}
              onPointerDown={(e) => {
                e.stopPropagation()
                iniciarArrastre({ modo: 'redimensionar', esquina: id, inicial: recorte })
              }}
              className={cn('absolute size-[22px] touch-none', posicion, cursor)}
            >
              <span
                aria-hidden="true"
                className={cn('absolute size-[9px] rounded-xs border border-noche-900/55 bg-luz', cubo)}
              />
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 font-mono text-micro uppercase text-disabled">
        <span className="truncate">{etiqueta}</span>
        {pxAncho !== null && pxAlto !== null && (
          <span className="shrink-0 text-subtle">
            {pxAncho} × {pxAlto} px
          </span>
        )}
      </div>

      <div className="flex flex-col gap-3 md:flex-row">
        <button
          type="button"
          onClick={() => onConfirmar(recorte)}
          className="btn-primary w-full md:w-auto"
        >
          <ScanText aria-hidden="true" size={16} />
          Leer esta imagen
        </button>
        {!recorteCompleto && (
          <button
            type="button"
            onClick={() => setRecorte(RECORTE_COMPLETO)}
            className="btn-secondary w-full md:w-auto"
          >
            <Maximize2 aria-hidden="true" size={16} />
            Usar la imagen completa
          </button>
        )}
      </div>

      <p className="font-mono text-micro uppercase text-disabled">
        La imagen se usa solo para leerla y no se guarda
      </p>
    </section>
  )
}
