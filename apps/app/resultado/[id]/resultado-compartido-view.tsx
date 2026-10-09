'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Search, SearchX, Trash2 } from 'lucide-react'
import { Aurora } from '@/components/aurora'
import { Logo } from '@/components/logo'
import { Sidebar } from '@/components/sidebar'
import { ThemeToggle } from '@/components/theme-toggle'
import { ResultadoCompleto } from '@/components/result/resultado-completo'
import { apiFetch, ApiError, type HistoryItem } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { historyItemToAnalyzeResponse } from '@/lib/resultado-storage'

/**
 * La pantalla de un análisis guardado. Es LA pantalla de resultado del producto.
 *
 * Sirve dos públicos con la misma URL, que es justamente lo que la hace valer:
 *
 *  - **Sin sesión:** el link de "Compartir verificación". Alguien recibe una nota por
 *    WhatsApp, se la mandan verificada, y lo primero que ve es el análisis entero con
 *    las fuentes y el razonamiento. Por eso muestra todo y no un preview.
 *  - **Con sesión:** tu propio análisis, con el sidebar, el botón de volver al historial
 *    y el de borrarlo.
 *
 * Antes el resultado propio vivía en `/resultado` leyendo sessionStorage: recargar la
 * página lo perdía, no se podía guardar en favoritos, y había DOS vistas distintas
 * (ésta mostraba solo la card). Ahora `/analizando` redirige acá en cuanto el análisis
 * se guardó, y `/resultado` quedó solo para lo que no tiene id (el ejemplo y los
 * análisis cuyo guardado falló).
 *
 * El `id` llega como prop en vez de leerse de `params` acá: ese trabajo lo hace el
 * `page.tsx` del server, que además usa el mismo id para armar la preview de Open Graph
 * antes de renderizar este componente (ver ese archivo).
 */
export function ResultadoCompartidoView({ id }: { id: string }) {
  const { user } = useAuth()
  const [estado, setEstado] = useState<'cargando' | 'no-encontrado' | 'listo'>('cargando')
  const [item, setItem] = useState<HistoryItem | null>(null)

  // Se vuelve a pedir cuando cambia la sesión: un análisis de captura solo lo sirve el
  // backend a su dueño (GET /analyses/:id con auth opcional), y la resolución de auth es
  // client-side, así que el primer fetch puede salir sin token y dar 404.
  useEffect(() => {
    let vigente = true
    apiFetch<HistoryItem>(`/analyses/${id}`)
      .then((data) => {
        if (!vigente) return
        setItem(data)
        setEstado('listo')
      })
      .catch(() => {
        if (!vigente) return
        setEstado('no-encontrado')
      })
    return () => {
      vigente = false
    }
  }, [id, user])

  const contenido =
    estado === 'cargando' ? (
      <VistaCargando />
    ) : estado === 'no-encontrado' ? (
      <VistaNoEncontrado conSesion={Boolean(user)} />
    ) : item ? (
      <ResultadoCompleto
        analysis={historyItemToAnalyzeResponse(item)}
        fecha={item.createdAt}
        acciones={user ? <AccionesPropias id={item.id} /> : <AccionesVisitante />}
      />
    ) : null

  // Con sesión, el marco es el de la app (sidebar). Sin sesión, el encabezado público:
  // quien abre un link compartido no tiene por qué ver la navegación de una cuenta.
  if (user) {
    return <Sidebar>{contenido}</Sidebar>
  }

  return (
    <main className="relative isolate min-h-screen overflow-hidden">
      <Aurora intensity="soft" />
      <div className="mx-auto flex w-full max-w-shell flex-col gap-2 px-gutter pt-8 md:px-6 md:pt-12">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" aria-label="AletheIA — inicio">
            <Logo showParent />
          </Link>
          <ThemeToggle />
        </div>
      </div>
      {contenido}
      <p className="mx-auto w-full max-w-shell px-gutter pb-12 font-mono text-micro uppercase text-disabled md:px-6">
        Verificación hecha con AletheIA — Boreal Data
      </p>
    </main>
  )
}

function VistaCargando() {
  return (
    <div className="mx-auto w-full max-w-card px-gutter py-12 md:px-6 md:py-16">
      <section aria-busy="true" className="card-shell border-t-border">
        <span className="h-3 w-24 animate-pulse-soft rounded-sm bg-border" />
        <span className="h-6 w-4/5 animate-pulse-soft rounded-sm bg-border" />
        <span className="h-3 w-3/5 animate-pulse-soft rounded-sm bg-border" />
      </section>
    </div>
  )
}

/**
 * Un 404 acá puede ser tres cosas distintas: el link llegó cortado, el análisis se
 * borró, o es una captura ajena (que el backend no sirve a nadie más que a su dueño). No
 * se puede saber cuál, y a propósito: distinguirlas contaría qué ids existen. El texto
 * cubre las tres sin mentir en ninguna.
 */
function VistaNoEncontrado({ conSesion }: { conSesion: boolean }) {
  return (
    <div className="mx-auto w-full max-w-card px-gutter py-12 md:px-6 md:py-16">
      <section role="alert" className="card-shell border-t-verdict-dudoso">
        <p className="chip self-start text-verdict-dudoso">
          <SearchX aria-hidden="true" size={14} /> No encontrado
        </p>
        <h1 className="font-display text-h3 font-semibold text-display">
          No encontramos esta verificación
        </h1>
        <p className="text-body-sm text-muted">
          El link puede haber quedado cortado al copiarlo, el análisis puede haberse
          borrado, o puede ser de otra persona. Podés verificar la nota vos mismo en unos
          segundos.
        </p>
        <Link href={conSesion ? '/dashboard' : '/'} className="btn-primary self-start">
          <Search aria-hidden="true" size={16} />
          Verificar una nota
        </Link>
      </section>
    </div>
  )
}

/** Lo que puede hacer el dueño del análisis. */
function AccionesPropias({ id }: { id: string }) {
  const router = useRouter()
  const [borrando, setBorrando] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const borrar = () => {
    setBorrando(true)
    setError(null)
    apiFetch(`/analyses/${id}`, { method: 'DELETE' })
      .then(() => router.replace('/historial'))
      .catch((err) => {
        setBorrando(false)
        setConfirmando(false)
        setError(
          err instanceof ApiError
            ? err.message
            : 'No pudimos borrarlo. Probá de nuevo en unos segundos.',
        )
      })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 md:flex-row">
        <Link href="/historial" className="btn-secondary w-full md:w-auto">
          <ArrowLeft aria-hidden="true" size={16} />
          Volver al historial
        </Link>

        {/* El borrado es irreversible, así que pide una confirmación explícita en el
            lugar, sin un diálogo del navegador: el segundo clic es sobre un botón que
            dice qué va a pasar. */}
        {confirmando ? (
          <div className="flex flex-col gap-2 md:flex-row">
            <button
              type="button"
              onClick={borrar}
              disabled={borrando}
              className="btn-secondary w-full border-verdict-falso/40 text-verdict-falso md:w-auto"
            >
              <Trash2 aria-hidden="true" size={16} />
              {borrando ? 'Borrando…' : 'Sí, borrar para siempre'}
            </button>
            <button
              type="button"
              onClick={() => setConfirmando(false)}
              disabled={borrando}
              className="btn-secondary w-full md:w-auto"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmando(true)}
            className="btn-secondary w-full md:w-auto"
          >
            <Trash2 aria-hidden="true" size={16} />
            Borrar este análisis
          </button>
        )}
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-verdict-falso/30 bg-verdict-falso/10 p-3.5 text-caption tracking-normal text-verdict-falso"
        >
          {error}
        </p>
      )}
    </div>
  )
}

/** Lo que puede hacer alguien que llegó por un link compartido. */
function AccionesVisitante() {
  return (
    <div className="flex flex-col gap-3 md:flex-row">
      <Link href="/registro" className="btn-primary w-full md:w-auto">
        <Search aria-hidden="true" size={16} />
        Verificar una nota tuya
      </Link>
      <Link href="/" className="btn-secondary w-full md:w-auto">
        Conocer AletheIA
      </Link>
    </div>
  )
}
