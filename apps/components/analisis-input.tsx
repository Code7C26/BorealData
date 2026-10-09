'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ImagePlus, Loader2, Search, Sparkles } from 'lucide-react'
import { AnalysisPanel, MAX_CHARS, type AnalysisState } from '@/components/result/analysis-panel'
import { LecturaRevision } from '@/components/lectura-revision'
import { RecorteImagen } from '@/components/recorte-imagen'
import { ApiError, leerImagen, type CaptureReading } from '@/lib/api'
import { prepararImagen, TIPOS_ACEPTADOS, type Recorte } from '@/lib/imagen'
import {
  guardarBorrador,
  guardarContenidoPendiente,
  leerBorrador,
  sinSuscripcion,
} from '@/lib/resultado-storage'
import { cn } from '@/lib/utils'

/**
 * Estado inicial · vacío — y el formulario de análisis.
 *
 * El vacío ES el formulario: nunca una ilustración vacía ni un "aún no hay
 * nada". Es el estado de trabajo, no un hueco esperando contenido.
 *
 * El borde superior va en borde neutro: ningún color de veredicto antes de
 * tener veredicto.
 *
 * Hay dos caminos acá adentro. El de siempre es la URL: el servidor va a
 * buscarla y la lee. El segundo es una imagen —subida, arrastrada o pegada con
 * Ctrl+V—, para todo lo que una URL no alcanza a describir: un posteo privado,
 * una historia, una cadena de WhatsApp. Ese camino es de dos pasos (leer la
 * imagen, confirmar lo leído) y recién después verifica, porque el veredicto
 * sale del texto confirmado y no de los píxeles. Ver
 * DOCS/BRIEF-captura-contenido-privado.md.
 */

/** En qué parte del camino de la imagen estamos. */
type EstadoImagen =
  | { paso: 'recortando'; src: string; archivo: Blob; etiqueta: string }
  | { paso: 'leyendo' }
  | { paso: 'revisando'; lectura: CaptureReading }

export function AnalisisInput({ className }: { className?: string }) {
  const router = useRouter()
  /**
   * El input jamás se pierde: si volviste acá después de un error (o recargaste), se
   * repone lo que habías pegado.
   *
   * El borrador vive en sessionStorage, o sea afuera de React: se lee con
   * `useSyncExternalStore` en vez de copiarlo a estado desde un efecto, que renderizaba
   * una vez con el campo vacío y lo corregía después. El snapshot es un string, así que
   * la comparación por identidad del hook alcanza.
   *
   * `null` en `editado` significa "todavía no tocó el campo": ahí manda el borrador.
   */
  const borrador = useSyncExternalStore(sinSuscripcion, leerBorrador, () => '')
  const [editado, setEditado] = useState<string | null>(null)
  const valor = editado ?? borrador
  const setValor = setEditado

  const [estado, setEstado] = useState<AnalysisState>({ kind: 'idle' })
  const [imagen, setImagen] = useState<EstadoImagen | null>(null)
  const [errorImagen, setErrorImagen] = useState<string | null>(null)
  const [arrastrando, setArrastrando] = useState(false)
  const inputArchivoRef = useRef<HTMLInputElement>(null)
  // El object URL hay que revocarlo a mano o el blob queda retenido hasta que
  // se cierre la pestaña, y acá son capturas de pantalla enteras.
  const srcRef = useRef<string | null>(null)

  useEffect(() => {
    return () => {
      if (srcRef.current) URL.revokeObjectURL(srcRef.current)
    }
  }, [])

  const analizar = (texto: string) => {
    const limpio = texto.trim()
    if (!limpio) return

    guardarBorrador(limpio)

    if (limpio.length > MAX_CHARS) {
      setEstado({ kind: 'error-too-long', length: limpio.length })
      return
    }

    if (!esUrlDeNota(limpio)) {
      setEstado({ kind: 'error-url', value: limpio })
      return
    }

    router.push(`/analizando?tipo=url&valor=${encodeURIComponent(limpio)}`)
  }

  // /ejemplo es una ruta pública: el ejemplo tiene que poder verse SIN cuenta,
  // que es justo para quien sirve. (Antes iba a /resultado, dentro del área
  // autenticada, y a un visitante lo escupía al login.)
  const verEjemplo = () => router.push('/ejemplo')

  // ── Camino de la imagen ──────────────────────────────────────────────────

  const tomarImagen = (archivo: File | Blob, etiqueta: string) => {
    setErrorImagen(null)
    if (srcRef.current) URL.revokeObjectURL(srcRef.current)
    const src = URL.createObjectURL(archivo)
    srcRef.current = src
    setImagen({ paso: 'recortando', src, archivo, etiqueta })
  }

  const descartarImagen = () => {
    if (srcRef.current) URL.revokeObjectURL(srcRef.current)
    srcRef.current = null
    setImagen(null)
    setErrorImagen(null)
    // Sin esto, volver a elegir el MISMO archivo no dispara onChange.
    if (inputArchivoRef.current) inputArchivoRef.current.value = ''
  }

  const leerRecorte = async (recorte: Recorte) => {
    if (imagen?.paso !== 'recortando') return
    const { archivo } = imagen
    setImagen({ paso: 'leyendo' })
    setErrorImagen(null)

    try {
      const preparada = await prepararImagen(archivo, recorte)
      const lectura = await leerImagen([preparada.image])
      // La imagen cumplió su función: se suelta acá, antes de seguir.
      if (srcRef.current) URL.revokeObjectURL(srcRef.current)
      srcRef.current = null
      setImagen({ paso: 'revisando', lectura })
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace('/login')
        return
      }
      setErrorImagen(err instanceof Error ? err.message : 'No pudimos leer esa imagen.')
      // Vuelve al recorte para poder reintentar con otro encuadre, que es lo
      // que arregla la mayoría de las lecturas fallidas.
      if (srcRef.current) {
        setImagen({ paso: 'recortando', src: srcRef.current, archivo, etiqueta: imagen.etiqueta })
      } else {
        setImagen(null)
      }
    }
  }

  const verificarLectura = (texto: string) => {
    if (imagen?.paso !== 'revisando') return
    const { lectura } = imagen
    guardarContenidoPendiente({
      kind: 'image',
      text: texto,
      platform: lectura.platform,
      author: lectura.author,
      etiqueta: lectura.author ?? 'imagen analizada',
    })
    router.push('/analizando?tipo=contenido')
  }

  /** Ctrl+V en cualquier parte de la página: el camino más corto para una captura. */
  useEffect(() => {
    if (imagen) return
    const alPegar = (e: ClipboardEvent) => {
      const archivo = [...(e.clipboardData?.items ?? [])]
        .find((item) => item.kind === 'file' && item.type.startsWith('image/'))
        ?.getAsFile()
      if (!archivo) return
      e.preventDefault()
      tomarImagen(archivo, 'captura pegada')
    }
    window.addEventListener('paste', alPegar)
    return () => window.removeEventListener('paste', alPegar)
  }, [imagen])

  if (imagen?.paso === 'recortando') {
    return (
      <div className={cn('flex flex-col gap-4', className)}>
        {errorImagen && <ErrorImagen mensaje={errorImagen} />}
        <RecorteImagen
          src={imagen.src}
          etiqueta={imagen.etiqueta}
          onConfirmar={leerRecorte}
          onCancelar={descartarImagen}
        />
      </div>
    )
  }

  if (imagen?.paso === 'leyendo') {
    return (
      <section className={cn('card-shell border-t-border items-start', className)}>
        <p className="flex items-center gap-3 font-display text-h3 font-semibold text-display">
          <Loader2 aria-hidden="true" size={20} className="animate-spin" />
          Leyendo la imagen
        </p>
        <p className="text-body-sm text-muted">
          Transcribimos lo que dice la publicación. Todavía no hay veredicto: primero lo vas a
          poder revisar.
        </p>
      </section>
    )
  }

  if (imagen?.paso === 'revisando') {
    return (
      <LecturaRevision
        lectura={imagen.lectura}
        onVerificar={verificarLectura}
        onCancelar={descartarImagen}
        className={className}
      />
    )
  }

  if (estado.kind !== 'idle') {
    return (
      <AnalysisPanel
        state={estado}
        className={className}
        onEditar={() => setEstado({ kind: 'idle' })}
        onTruncate={() => analizar(valor.trim().slice(0, MAX_CHARS))}
      />
    )
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        analizar(valor)
      }}
      onDragOver={(e) => {
        e.preventDefault()
        setArrastrando(true)
      }}
      onDragLeave={() => setArrastrando(false)}
      onDrop={(e) => {
        e.preventDefault()
        setArrastrando(false)
        const archivo = [...e.dataTransfer.files].find((f) => f.type.startsWith('image/'))
        if (archivo) tomarImagen(archivo, archivo.name)
        else setErrorImagen('Eso no es una imagen. Soltá un JPG, PNG o WebP.')
      }}
      className={cn(
        'card-shell border-t-border transition-colors duration-150',
        arrastrando && 'border-accent-text',
        className,
      )}
      aria-labelledby="idle-title"
    >
      <h2 id="idle-title" className="font-display text-h3 font-semibold text-display">
        Pegá el enlace de la nota que querés chequear
      </h2>
      <p className="text-body-sm text-muted">
        Tarda unos segundos y te mostramos cada paso del análisis.
      </p>

      <label className="flex flex-col gap-3">
        <span className="sr-only">Enlace de la nota</span>
        <textarea
          rows={3}
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          onKeyDown={(e) => {
            // Enter analiza; Shift+Enter deja escribir varias líneas.
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              analizar(valor)
            }
          }}
          maxLength={MAX_CHARS * 2}
          spellCheck={false}
          placeholder="https://diario-ejemplo.com/nota/8821"
          className="field-input resize-y font-mono text-caption tracking-normal"
          aria-label="Enlace de la nota"
        />
      </label>

      <div className="flex flex-col gap-3 md:flex-row">
        <button type="submit" disabled={!valor.trim()} className="btn-primary w-full md:w-auto">
          <Search aria-hidden="true" size={16} />
          Analizar
        </button>
        <button type="button" onClick={verEjemplo} className="btn-secondary w-full md:w-auto">
          <Sparkles aria-hidden="true" size={16} />
          Probar un ejemplo
        </button>
      </div>

      {/* La segunda puerta de entrada. Un enlace no alcanza para un posteo
          privado, una historia o una cadena de WhatsApp: ahí el contenido es
          una imagen y hay que leerla. */}
      <div className="flex items-center gap-3 font-mono text-micro uppercase text-disabled">
        <span className="h-px flex-1 bg-border" aria-hidden="true" />o
        <span className="h-px flex-1 bg-border" aria-hidden="true" />
      </div>

      <button
        type="button"
        onClick={() => inputArchivoRef.current?.click()}
        className="flex w-full flex-col gap-1 rounded-lg border border-border-strong bg-surface-sunk p-4 text-left transition-colors duration-150 hover:border-accent-text"
      >
        <span className="flex items-center gap-2 font-display text-body-sm font-semibold text-display">
          <ImagePlus aria-hidden="true" size={16} />
          Analizar una imagen
        </span>
        <span className="text-caption tracking-normal text-subtle">
          Subí una captura, arrastrala acá o pegala con Ctrl+V. Para posteos y cadenas que no se
          pueden leer por su enlace.
        </span>
      </button>

      <input
        ref={inputArchivoRef}
        type="file"
        accept={TIPOS_ACEPTADOS}
        className="sr-only"
        onChange={(e) => {
          const archivo = e.target.files?.[0]
          if (archivo) tomarImagen(archivo, archivo.name)
        }}
      />

      {errorImagen && <ErrorImagen mensaje={errorImagen} />}

      {/* La nota de privacidad va en micro, abajo, sin ícono de candado.
          Decía "No guardamos lo que analizás" y era falso: los análisis se
          guardan en tu historial, y los de enlaces se reusan entre cuentas. En
          un producto cuyo argumento es la honestidad, la línea de privacidad es
          el último lugar donde se puede prometer de más — ahora dice lo que el
          backend hace de verdad y linkea al detalle completo. */}
      <p className="font-mono text-micro uppercase text-disabled">
        Las imágenes no se guardan ·{' '}
        <Link href="/privacidad" className="underline hover:text-accent-text">
          Qué hacemos con tus datos
        </Link>
      </p>
    </form>
  )
}

function ErrorImagen({ mensaje }: { mensaje: string }) {
  return (
    <p
      role="alert"
      className="rounded-lg border border-verdict-falso/30 bg-verdict-falso/10 p-3.5 text-caption tracking-normal text-verdict-falso"
    >
      {mensaje}
    </p>
  )
}

/**
 * ¿Esto parece un enlace a una publicación?
 *
 * Deliberadamente permisivo: acepta sin protocolo (la gente copia
 * "diario.com/nota" desde el navegador) pero exige host con punto y TLD de al
 * menos dos letras, que es lo que separa un enlace cortado de uno entero.
 * Las validaciones que importan de verdad las hace el backend al scrapear.
 */
function esUrlDeNota(valor: string): boolean {
  if (/\s/.test(valor)) return false
  try {
    const url = new URL(/^https?:\/\//i.test(valor) ? valor : `https://${valor}`)
    return /^[^.]+(\.[^.]+)+$/.test(url.hostname) && /\.[a-z]{2,}$/i.test(url.hostname)
  } catch {
    return false
  }
}
