'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AnalysisPanel, STEPS } from '@/components/result/analysis-panel'
import { apiFetch, ApiError, type AnalyzeResponse } from '@/lib/api'
import {
  guardarResultado,
  limpiarBorrador,
  type ResultadoGuardado,
} from '@/lib/resultado-storage'

/** Cuánto dura cada paso de la animación mientras se espera al backend. */
const DURACION_POR_PASO_MS = 2200

/** Cadencia del contador de segundos (alimenta el aviso de "está tardando"). */
const TICK_MS = 1000

type Paso = 0 | 1 | 2 | 3

function AnalizandoContent({ valor }: { valor: string }) {
  const router = useRouter()
  const [paso, setPaso] = useState<Paso>(0)
  const [segundos, setSegundos] = useState(0)
  const [respuestaLista, setRespuestaLista] = useState(false)
  const resultadoRef = useRef<ResultadoGuardado | null>(null)
  const iniciadoRef = useRef(false)

  // Dispara el análisis real una única vez (el ref evita el doble fetch que
  // provoca React Strict Mode en dev al montar el efecto dos veces — acá
  // importa de verdad porque cada llamada gasta una consulta real a Gemini).
  useEffect(() => {
    if (iniciadoRef.current) return
    iniciadoRef.current = true

    if (!valor) {
      resultadoRef.current = { status: 'error', tipo: 'url', valor }
      setRespuestaLista(true)
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
  }, [valor, router])

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
  useEffect(() => {
    if (!respuestaLista || !resultadoRef.current) return
    guardarResultado(resultadoRef.current)
    const t = setTimeout(() => router.push('/resultado'), 600)
    return () => clearTimeout(t)
  }, [respuestaLista, router])

  return (
    <div className="mx-auto flex w-full max-w-card flex-col gap-6 px-gutter py-16 md:px-6">
      <AnalysisPanel
        state={{ kind: 'loading', step: paso, elapsed: segundos, resuelto: respuestaLista }}
      />
      <p className="truncate px-1 font-mono text-micro uppercase text-disabled" title={valor}>
        {valor.replace(/^https?:\/\//, '')}
      </p>
    </div>
  )
}

function AnalizandoWrapper() {
  const searchParams = useSearchParams()
  const valor = searchParams.get('valor') ?? ''

  // key = searchParams.toString() fuerza un remount completo cada vez que
  // cambia la URL, así el estado de los pasos siempre arranca de cero
  // (Next.js reutiliza el componente si solo cambian los query params).
  return <AnalizandoContent key={searchParams.toString()} valor={valor} />
}

export default function AnalizandoPage() {
  return (
    <Suspense fallback={null}>
      <AnalizandoWrapper />
    </Suspense>
  )
}
