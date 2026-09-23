'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, History, Mail, Menu, Plus, Settings, X } from 'lucide-react'
import { CieloEstrellado } from '@/components/cielo-estrellado'
import { Logo, LogoMark } from '@/components/logo'
import { ThemeToggle } from '@/components/theme-toggle'
import { useAuth } from '@/lib/auth-context'
import { iniciales } from '@/lib/usuario'
import { apiFetch, type HistoryItem } from '@/lib/api'
import { guardarResultadoDesdeHistorial } from '@/lib/resultado-storage'
import { normalize, VERDICT } from '@/lib/verdict'
import { cn } from '@/lib/utils'

// Perfil se accede desde el bloque de usuario (arriba), no se repite acá.
const NAV_INFERIOR = [
  { href: '/historial', label: 'Historial', icon: History },
  { href: '/configuracion', label: 'Configuración', icon: Settings },
  { href: '/contacto', label: 'Contacto', icon: Mail },
]

const COLAPSO_STORAGE_KEY = 'aletheia_sidebar_colapsada'

/** Cuántos análisis se muestran en "Recientes". El listado completo vive en /historial. */
const CANTIDAD_RECIENTES = 5

function ContenidoSidebar({
  colapsada,
  nombre,
  email,
  recientes,
  onNavigate,
}: {
  colapsada: boolean
  nombre: string
  email: string
  recientes: HistoryItem[]
  onNavigate?: () => void
}) {
  const pathname = usePathname()
  const router = useRouter()

  const abrirReciente = (item: HistoryItem) => {
    guardarResultadoDesdeHistorial(item)
    onNavigate?.()
    // El id en la URL fuerza a /resultado a releer sessionStorage aunque ya
    // estés parado ahí (ver comentario en app/(autenticado)/resultado/page.tsx).
    router.push(`/resultado?item=${item.id}`)
  }

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className={cn('flex items-center px-5 py-6', colapsada && 'justify-center px-0')}>
        {colapsada ? <LogoMark className="h-8 w-8" /> : <Logo showParent />}
      </div>

      {/* Usuario — arriba, siempre visible, único punto de entrada a Perfil */}
      <div className={cn('px-4 pb-4', colapsada && 'px-2')}>
        <Link
          href="/perfil"
          onClick={onNavigate}
          title={colapsada ? `${nombre} · Ver perfil` : 'Ver perfil'}
          className={cn(
            'flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-3',
            'transition-colors duration-150 ease-boreal hover:border-accent-text',
            colapsada && 'justify-center px-0',
          )}
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-pill bg-accent font-mono text-micro font-medium text-bruma">
            {iniciales(nombre)}
          </span>
          {!colapsada && (
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-body-sm font-medium text-ink">{nombre}</span>
              <span className="truncate font-mono text-micro normal-case tracking-normal text-subtle">
                {email}
              </span>
            </span>
          )}
        </Link>
      </div>

      {/* Nueva verificación */}
      <div className={cn('px-4', colapsada && 'px-2')}>
        <Link
          href="/dashboard"
          onClick={onNavigate}
          title="Verificar una nota"
          className={cn('btn-primary w-full', colapsada && 'px-0')}
        >
          <Plus size={16} className="shrink-0" aria-hidden="true" />
          {!colapsada && 'Verificar una nota'}
        </Link>
      </div>

      {/* Recientes — se ocultan colapsada, no entran en un riel de íconos */}
      {!colapsada && (
        <div className="mt-8 flex min-h-0 flex-1 flex-col px-4">
          <p className="px-1 font-mono text-micro uppercase text-subtle">Recientes</p>
          <div className="mt-3 flex-1 space-y-1 overflow-y-auto scrollbar-thin">
            {recientes.length === 0 ? (
              <p className="px-1 py-2 text-caption tracking-normal text-disabled">
                Acá van a quedar tus últimas verificaciones.
              </p>
            ) : (
              recientes.map((item) => {
                const { verdict } = normalize(item.verdict, item.confidence)
                return (
                  <button
                    key={item.id}
                    onClick={() => abrirReciente(item)}
                    title={item.headline || item.title || item.url}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-body-sm text-muted transition-colors duration-150 ease-boreal hover:bg-surface hover:text-ink"
                  >
                    {/* Dot de veredicto: color + el título al lado, nunca el color solo. */}
                    <span
                      aria-hidden="true"
                      className={cn('size-2 shrink-0 rounded-sm', VERDICT[verdict].bg)}
                    />
                    <span className="truncate">{item.title || item.headline || item.url}</span>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
      {colapsada && <div className="flex-1" />}

      {/* Navegación inferior */}
      <div className={cn('border-t border-border px-4 py-4', colapsada && 'px-2')}>
        <div className="space-y-1">
          {NAV_INFERIOR.map((item) => {
            const activo = pathname === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                title={item.label}
                aria-current={activo ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-body-sm font-medium',
                  'transition-colors duration-150 ease-boreal',
                  colapsada && 'justify-center px-0',
                  activo
                    ? 'bg-surface text-ink'
                    : 'text-muted hover:bg-surface hover:text-ink',
                )}
              >
                <Icon
                  size={16}
                  aria-hidden="true"
                  className={cn('shrink-0', activo && 'text-accent-text')}
                />
                {!colapsada && item.label}
              </Link>
            )
          })}
        </div>

        <div className={cn('mt-3 flex items-center gap-2', colapsada && 'justify-center')}>
          <ThemeToggle />
          {!colapsada && (
            <span className="font-mono text-micro uppercase text-disabled">Modo de lectura</span>
          )}
        </div>
      </div>
    </div>
  )
}

export function Sidebar({ children }: { children: React.ReactNode }) {
  const [mobileAbierto, setMobileAbierto] = useState(false)
  const [colapsada, setColapsada] = useState(false)
  const [listo, setListo] = useState(false)
  const [recientes, setRecientes] = useState<HistoryItem[]>([])
  const pathname = usePathname()
  const { user, profile } = useAuth()

  const nombre = profile?.fullName || user?.displayName || user?.email?.split('@')[0] || 'Usuario'
  const email = user?.email ?? ''

  // Carga preferencia de colapso una vez montado (localStorage es client-only)
  useEffect(() => {
    try {
      if (window.localStorage.getItem(COLAPSO_STORAGE_KEY) === 'true') setColapsada(true)
    } catch {
      // Storage bloqueado: arranca expandida, que es el default razonable.
    }
    setListo(true)
  }, [])

  // Se recarga en cada navegación y no solo al montar: el layout de
  // (autenticado) mantiene este Sidebar montado toda la sesión, así que con
  // [] la lista quedaba congelada desde que se abría la app y los análisis
  // nuevos nunca aparecían (el historial sí los mostraba porque hace su
  // propio fetch al entrar).
  useEffect(() => {
    apiFetch<{ analyses: HistoryItem[] }>(`/history?limit=${CANTIDAD_RECIENTES}`)
      .then((res) => setRecientes(res.analyses))
      .catch(() => setRecientes([]))
  }, [pathname])

  useEffect(() => {
    setMobileAbierto(false)
  }, [pathname])

  const alternarColapso = () => {
    setColapsada((prev) => {
      const nuevo = !prev
      try {
        window.localStorage.setItem(COLAPSO_STORAGE_KEY, String(nuevo))
      } catch {
        // idem
      }
      return nuevo
    })
  }

  // Evita un flash de contenido incorrecto mientras se lee localStorage
  if (!listo) {
    return <div className="min-h-screen bg-bg" />
  }

  return (
    /* `isolate` es necesario: sin eso, el fondo opaco de este mismo contenedor
       se pinta por encima de las capas con z-index negativo del ambiente.
       IMPORTANTE: acá NO va `overflow-hidden`. Puesto en este div raíz rompe
       `position: sticky` en cualquier descendiente (el "Volver al historial" de
       /resultado, la card sticky del panel lateral) porque deja de existir un
       ancestro con overflow visible hasta el viewport y el navegador no tiene
       dónde "pegar" el sticky. El recorte del ambiente lo hace `.aurora-field`,
       que trae su propio overflow-hidden. */
    <div className="relative isolate min-h-screen bg-bg">
      {/* El mismo cielo de la landing, en su versión de trabajo: tenue y sin la
          linterna del cursor, que acá distraería de la card. */}
      <CieloEstrellado tenue linterna={false} />

      {/* Barra superior mobile */}
      <div className="relative flex items-center justify-between border-b border-border bg-bg/70 px-4 py-3 backdrop-blur-xl lg:hidden">
        <button
          onClick={() => setMobileAbierto(true)}
          aria-label="Abrir menú"
          className="flex size-9 items-center justify-center rounded-lg text-muted transition-colors duration-150 ease-boreal hover:bg-surface hover:text-ink"
        >
          <Menu size={20} aria-hidden="true" />
        </button>
        <Logo />
        <ThemeToggle className="size-9" />
      </div>

      {/* Sidebar fijo — desktop.
          Tiene vida propia pero no queda igual al área de contenido: usa el
          fondo hundido con una veladura del ambiente por detrás, así se sigue
          distinguiendo del área donde vive la card. */}
      <aside
        className={cn(
          'isolate hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:flex lg:flex-col',
          'lg:border-r lg:border-border lg:bg-surface-sunk/85 lg:backdrop-blur-2xl',
          'lg:transition-[width] lg:duration-200 lg:ease-boreal',
          colapsada ? 'lg:w-[76px]' : 'lg:w-72',
        )}
      >
        {/* Capa decorativa. Va en su propio contenedor con overflow-hidden para
            recortar el halo sin cortar el botón de colapsar, que sobresale. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <span
            className="aurora-band animate-aurora-drift-slow"
            style={{ background: 'var(--aurora-a)', width: '18rem', height: '14rem', top: '-6rem', left: '-4rem' }}
          />
          {/* Borde derecho con degradé: reemplaza visualmente la línea plana. */}
          <span className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-accent/45 to-transparent" />
        </div>

        <ContenidoSidebar colapsada={colapsada} nombre={nombre} email={email} recientes={recientes} />

        {/* Toggle colapsar/expandir */}
        <button
          onClick={alternarColapso}
          aria-label={colapsada ? 'Expandir menú' : 'Colapsar menú'}
          className="absolute -right-3 top-9 flex size-6 items-center justify-center rounded-pill border border-border bg-surface text-subtle transition-colors duration-150 ease-boreal hover:border-accent-text hover:text-accent-text"
        >
          {colapsada ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </aside>

      {/* Drawer — mobile */}
      {mobileAbierto && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-noche-900/70"
            onClick={() => setMobileAbierto(false)}
            aria-hidden="true"
          />
          {/* Opaco a propósito: el contenido de la página queda justo detrás,
              con transparencia se leería a través del panel. */}
          <aside className="isolate absolute inset-y-0 left-0 flex w-72 max-w-[85%] animate-rise flex-col overflow-hidden border-r border-border bg-surface-sunk">
            <button
              onClick={() => setMobileAbierto(false)}
              aria-label="Cerrar menú"
              className="absolute right-3 top-5 z-10 flex size-8 items-center justify-center rounded-lg text-subtle hover:bg-surface hover:text-ink"
            >
              <X size={18} aria-hidden="true" />
            </button>
            <ContenidoSidebar
              colapsada={false}
              nombre={nombre}
              email={email}
              recientes={recientes}
              onNavigate={() => setMobileAbierto(false)}
            />
          </aside>
        </div>
      )}

      {/* Contenido de la página — el padding reacciona al colapso */}
      <main
        className={cn(
          'relative min-h-screen transition-[padding] duration-200 ease-boreal',
          colapsada ? 'lg:pl-[76px]' : 'lg:pl-72',
        )}
      >
        {children}
      </main>
    </div>
  )
}
