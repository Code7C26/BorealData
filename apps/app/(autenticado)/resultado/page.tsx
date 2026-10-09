'use client'

import { Suspense, useEffect, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { RotateCcw } from 'lucide-react'
import { AnalysisPanel, type AnalysisState } from '@/components/result/analysis-panel'
import { ResultadoCompleto } from '@/components/result/resultado-completo'
import { leerResultadoEstable, sinSuscripcion } from '@/lib/resultado-storage'

/**
 * El resultado que NO tiene id, leído de sessionStorage.
 *
 * Desde el 8-oct-2026 esta pantalla es la excepción, no el camino normal. Un análisis
 * guardado vive en su propia URL (`/resultado/:id`), que se puede recargar, guardar en
 * favoritos y compartir; `/analizando` redirige ahí en cuanto el backend devuelve un id.
 *
 * Acá quedan los dos casos que no tienen a dónde redirigir:
 *
 *  - **El análisis falló** (el scraper no pudo leer la nota, se cortó la red, el motor
 *    devolvió un error). No hay fila en la base, así que no hay URL posible.
 *  - **El guardado falló** aunque el análisis salió bien (la base no estaba disponible).
 *    El resultado existe en memoria y sería una lástima tirarlo, así que se muestra —
 *    sin link para compartir, porque no hay nada a dónde apuntar.
 *
 * Que esto sea la excepción es lo que arregla el problema de fondo: antes TODO resultado
 * vivía en sessionStorage, así que recargar la pantalla de resultado te devolvía al
 * dashboard y el link de compartir apuntaba a una página que solo funcionaba en tu
 * propio navegador.
 */
function ResultadoSinIdContent() {
  const router = useRouter()

  // sessionStorage es un dato de afuera de React: se lee con useSyncExternalStore en vez
  // de copiarlo a estado desde un efecto. En el servidor devuelve null (no existe), y en
  // el cliente el primer render ya tiene el resultado.
  const resultado = useSyncExternalStore(sinSuscripcion, leerResultadoEstable, () => null)

  // Las dos salidas de esta pantalla son navegaciones, no cambios de estado, así que sí
  // van en un efecto: redirigir durante el render es un efecto secundario.
  const destino =
    resultado === null
      ? // Se entró directo a /resultado sin pasar por /analizando: no hay nada que mostrar.
        '/dashboard'
      : // Si el análisis sí se guardó, su lugar es su propia URL.
        resultado.status === 'ok' && resultado.data?.id
        ? `/resultado/${resultado.data.id}`
        : null

  useEffect(() => {
    // `replace` y no `push`: esta pantalla no tiene que quedar en el medio del botón
    // "atrás" del navegador.
    if (destino) router.replace(destino)
  }, [destino, router])

  if (!resultado || destino) return null

  if (resultado.status === 'ok' && resultado.data) {
    return (
      <div className="min-h-screen">
        <ResultadoCompleto
          analysis={resultado.data}
          fecha={resultado.fecha}
          acciones={<AvisoNoGuardado />}
        />
      </div>
    )
  }

  const estado: AnalysisState =
    resultado.status === 'insuficiente'
      ? { kind: 'error-content', value: resultado.valor }
      : { kind: 'error-network', attempt: 1, code: resultado.codigo ?? 'NET_UNKNOWN' }

  return (
    <div className="min-h-screen">
      <VistaError estado={estado} valor={resultado.valor} />
    </div>
  )
}

/**
 * El análisis salió bien pero no se pudo guardar. Se dice, en vez de dejar que la
 * persona descubra sola que al recargar no está: es el único resultado del producto que
 * desaparece al cerrar la pestaña.
 */
function AvisoNoGuardado() {
  return (
    <div className="flex flex-col gap-3">
      <p className="rounded-lg border border-verdict-dudoso/30 bg-verdict-dudoso/10 p-3.5 text-caption tracking-normal text-verdict-dudoso">
        Este análisis no llegó a guardarse, así que no va a quedar en tu historial ni se
        puede compartir. Si cerrás la pestaña se pierde.
      </p>
      <Link href="/dashboard" className="btn-secondary self-start">
        <RotateCcw aria-hidden="true" size={16} />
        Analizar otra nota
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

function ResultadoWrapper() {
  const searchParams = useSearchParams()

  // key = searchParams.toString() fuerza un remount cada vez que cambia el
  // identificador en la URL — sin esto, Next no remonta si el pathname no cambia y no se
  // vuelve a leer sessionStorage.
  return <ResultadoSinIdContent key={searchParams.toString()} />
}

export default function ResultadoPage() {
  return (
    <Suspense fallback={null}>
      <ResultadoWrapper />
    </Suspense>
  )
}
