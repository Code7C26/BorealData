'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AnalysisPanel, STEPS } from '@/components/result/analysis-panel'
import { analizarContenido, apiFetch, ApiError, type AnalyzeResponse } from '@/lib/api'
import {
  guardarResultado,
  leerContenidoPendiente,
  limpiarBorrador,
  limpiarContenidoPendiente,
  type ResultadoGuardado,
} from '@/lib/resultado-storage'

/** Cuánto dura cada paso de la animación mientras se espera al backend. */
const DURACION_POR_PASO_MS = 2200

/** Cadencia del contador de segundos (alimenta el aviso de "está tardando"). */
const TICK_MS = 1000

type Paso = 0 | 1 | 2 | 3

/**
 * Dos caminos distintos para la misma pantalla.
 *
 * `url` es el de siempre: el servidor va a buscar la página y la lee.
 * `contenido` es para lo que el scraper no puede ver — una imagen que ya se
 * leyó y se confirmó en el dashboard. Ahí no hay URL que buscar: lo que se
 * verifica es el texto, que viaja por sessionStorage (ver
 * leerContenidoPendiente) porque no entra en un query param.
 */
function AnalizandoContent({ tipo, valor }: { tipo: string; valor: string }) {
  const router = useRouter()
  const [paso, setPaso] = useState<Paso>(0)
  const [segundos, setSegundos] = useState(0)
  /**
   * Llegar acá sin nada que analizar (una URL vacía) se sabe desde el primer render, así
   * que el estado arranca resuelto en vez de corregirse en el efecto. El componente se
   * remonta por `key` cada vez que cambian los query params, así que derivar el estado
   * inicial de las props es seguro.
   */
  const sinNadaQueAnalizar = tipo !== 'contenido' && !valor

  const [respuestaLista, setRespuestaLista] = useState(sinNadaQueAnalizar)
  const resultadoRef = useRef<ResultadoGuardado | null>(
    sinNadaQueAnalizar ? { status: 'error', tipo: 'url', valor } : null,
  )
  const iniciadoRef = useRef(false)

  // Dispara el análisis real una única vez (el ref evita el doble fetch que
  // provoca React Strict Mode en dev al montar el efecto dos veces — acá
  // importa de verdad porque cada llamada gasta una consulta real a Gemini).
  useEffect(() => {
    if (iniciadoRef.current || sinNadaQueAnalizar) return
    iniciadoRef.current = true

    if (tipo === 'contenido') {
      analizarContenidoPendiente()
      return
    }

    apiFetch<AnalyzeResponse>('/analyze', { method: 'POST', body: { url: valor } })
      .then((data) => {
        resultadoRef.current = {
          status: 'ok',
          tipo: 'url',
          valor,
          data,
          fecha: new Date().toISOString(),
        }
        // El borrador existe para que un error no te haga perder lo que pegaste.
        // Si el análisis salió bien ya cumplió su función: dejarlo hace que al
        // volver al formulario aparezca el enlace de la nota anterior ya cargado.
        limpiarBorrador()
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          router.replace('/login')
          return
        }
        // 422 = el scraper no pudo sacar contenido de la URL. No es un error del
        // producto ni un veredicto: es "sin datos suficientes", y así se muestra.
        const status = err instanceof ApiError && err.status === 422 ? 'insuficiente' : 'error'
        resultadoRef.current = {
          status,
          tipo: 'url',
          valor,
          mensaje: err instanceof Error ? err.message : undefined,
          codigo: err instanceof ApiError ? `HTTP_${err.status}` : 'NET_UNKNOWN',
        }
      })
      .finally(() => setRespuestaLista(true))

    /**
     * El paso 2 del camino de la imagen. El texto ya lo confirmó la persona en
     * el dashboard; acá solo se verifica y se guarda el resultado como
     * cualquier otro, para que /resultado no tenga que saber de dónde vino.
     */
    function analizarContenidoPendiente() {
      const pendiente = leerContenidoPendiente()
      if (!pendiente) {
        // Recarga directa de /analizando?tipo=contenido sin nada guardado: no
        // hay nada que analizar y repetir la lectura costaría otra llamada.
        resultadoRef.current = { status: 'error', tipo: 'contenido', valor: '' }
        setRespuestaLista(true)
        return
      }

      analizarContenido({
        kind: pendiente.kind,
        text: pendiente.text,
        platform: pendiente.platform,
        author: pendiente.author,
      })
        .then((data) => {
          resultadoRef.current = {
            status: 'ok',
            tipo: pendiente.kind,
            valor: pendiente.etiqueta,
            data,
            fecha: new Date().toISOString(),
          }
          // Ya se usó: dejarlo haría que volver atrás reanalice el posteo viejo.
          limpiarContenidoPendiente()
        })
        .catch((err) => {
          if (err instanceof ApiError && err.status === 401) {
            router.replace('/login')
            return
          }
          resultadoRef.current = {
            status: 'error',
            tipo: pendiente.kind,
            valor: pendiente.etiqueta,
            mensaje: err instanceof Error ? err.message : undefined,
            codigo: err instanceof ApiError ? `HTTP_${err.status}` : 'NET_UNKNOWN',
          }
        })
        .finally(() => setRespuestaLista(true))
    }
  }, [tipo, valor, router, sinNadaQueAnalizar])

  // Los pasos avanzan solos y se frenan en el último: son los pasos reales del
  // motor, pero el backend no emite progreso, así que la cadencia es local.
  useEffect(() => {
    if (paso >= STEPS.length - 1) return
    const t = setTimeout(() => setPaso((p) => (p + 1) as Paso), DURACION_POR_PASO_MS)
    return () => clearTimeout(t)
  }, [paso])

  useEffect(() => {
    if (respuestaLista) return
    const t = setInterval(() => setSegundos((s) => s + 1), TICK_MS)
    return () => clearInterval(t)
  }, [respuestaLista])

  // Recién navega cuando llegó la respuesta real Y el último paso estuvo un
  // instante marcado: el corte seco desde el primer paso se lee como un bug.
  //
  // A dónde navega depende de si el análisis se guardó: con id va a su propia URL
  // (`/resultado/:id`), que se puede recargar y compartir; sin id —análisis fallido, o
  // guardado que no funcionó— cae a `/resultado`, que lee sessionStorage. Por eso el
  // guardado en sessionStorage queda, pero solo lo usa el segundo camino.
  //
  // `replace` y no `push`: volver atrás desde el resultado tiene que llevar al
  // formulario, no a la pantalla de "analizando", que volvería a dispararse.
  useEffect(() => {
    if (!respuestaLista || !resultadoRef.current) return
    const resultado = resultadoRef.current
    guardarResultado(resultado)
    const destino =
      resultado.status === 'ok' && resultado.data?.id
        ? `/resultado/${resultado.data.id}`
        : '/resultado'
    const t = setTimeout(() => router.replace(destino), 600)
    return () => clearTimeout(t)
  }, [respuestaLista, router])

  return (
    <div className="mx-auto flex w-full max-w-card flex-col gap-6 px-gutter py-16 md:px-6">
      <AnalysisPanel
        state={{ kind: 'loading', step: paso, elapsed: segundos, resuelto: respuestaLista }}
      />
      <p className="truncate px-1 font-mono text-micro uppercase text-disabled" title={valor}>
        {tipo === 'contenido' ? valor || 'imagen analizada' : valor.replace(/^https?:\/\//, '')}
      </p>
    </div>
  )
}

function AnalizandoWrapper() {
  const searchParams = useSearchParams()
  const tipo = searchParams.get('tipo') ?? 'url'
  const valor = searchParams.get('valor') ?? ''

  // key = searchParams.toString() fuerza un remount completo cada vez que
  // cambia la URL, así el estado de los pasos siempre arranca de cero
  // (Next.js reutiliza el componente si solo cambian los query params).
  return <AnalizandoContent key={searchParams.toString()} tipo={tipo} valor={valor} />
}

export default function AnalizandoPage() {
  return (
    <Suspense fallback={null}>
      <AnalizandoWrapper />
    </Suspense>
  )
}
