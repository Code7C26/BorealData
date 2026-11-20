'use client'

import { useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { Bell, Globe, Moon, Sun } from 'lucide-react'
import { CerrarSesionBoton } from '@/components/cerrar-sesion-boton'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { IDIOMAS, NOMBRE_IDIOMA, traducciones } from '@/lib/idioma'
import {
  avisoActivado,
  esIOS,
  guardarAviso,
  mostrarPrueba,
  pedirPermiso,
  permisoActual,
  suscribirAviso,
  type EstadoPermiso,
} from '@/lib/notificaciones'
import { useIdioma, useTextos } from '@/lib/use-idioma'
import { useTheme } from '@/lib/use-theme'
import { cn } from '@/lib/utils'

const TEXTOS = traducciones({
  es: {
    eyebrow: 'Preferencias',
    titulo: 'Configuración',
    cuenta: 'Cuenta',
    idioma: 'Idioma',
    modoLectura: 'Modo de lectura',
    noche: 'Noche',
    papel: 'Papel',
    notificaciones: 'Notificaciones',
    avisoAnalisis: 'Avisarme cuando termine un análisis',
    avisoAnalisisBajada:
      'Una notificación en este dispositivo cuando AletheIA termina de verificar, si estás en otra pestaña o app.',
    avisoIos: 'En iPhone, las notificaciones solo funcionan con la app instalada.',
    instalarApp: 'Instalar la app',
    avisoNoSoportado: 'Este navegador no permite notificaciones.',
    avisoBloqueado:
      'Bloqueaste las notificaciones de AletheIA. Activalas desde la configuración del navegador (el candado de la barra de direcciones) y volvé a intentar.',
    pruebaTitulo: 'Avisos activados',
    pruebaCuerpo: 'Así te vamos a avisar cuando termine una verificación.',
    novedades: 'Novedades del producto',
    novedadesBajada: (email: string | null) =>
      `Un email${email ? ` a ${email}` : ''} cuando sumamos algo nuevo. Poco y espaciado.`,
    novedadesError: 'No pudimos guardar el cambio. Probá de nuevo en unos segundos.',
    cerrarSesion: 'Cerrar sesión',
    cerrarSesionBajada: 'Tu historial queda guardado; vas a tener que entrar de nuevo para verlo.',
  },
  en: {
    eyebrow: 'Preferences',
    titulo: 'Settings',
    cuenta: 'Account',
    idioma: 'Language',
    modoLectura: 'Reading mode',
    noche: 'Night',
    papel: 'Paper',
    notificaciones: 'Notifications',
    avisoAnalisis: 'Let me know when an analysis is done',
    avisoAnalisisBajada:
      "A notification on this device when AletheIA finishes checking, if you're on another tab or app.",
    avisoIos: 'On iPhone, notifications only work with the app installed.',
    instalarApp: 'Install the app',
    avisoNoSoportado: "This browser doesn't support notifications.",
    avisoBloqueado:
      'You blocked notifications for AletheIA. Allow them in your browser settings (the lock in the address bar) and try again.',
    pruebaTitulo: 'Notifications on',
    pruebaCuerpo: "This is how we'll let you know when a check is done.",
    novedades: 'Product news',
    novedadesBajada: (email: string | null) =>
      `An email${email ? ` to ${email}` : ''} when we add something new. Rarely and spaced out.`,
    novedadesError: "We couldn't save the change. Try again in a few seconds.",
    cerrarSesion: 'Log out',
    cerrarSesionBajada: "Your history stays saved; you'll need to log in again to see it.",
  },
})

function ToggleSwitch({
  checked,
  onChange,
  label,
  descripcion,
  nota,
  disabled = false,
  id,
}: {
  checked: boolean
  onChange: (valor: boolean) => void
  label: string
  descripcion?: string
  /** Aviso debajo de la descripción (permiso bloqueado, error al guardar…). */
  nota?: React.ReactNode
  disabled?: boolean
  id: string
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div className="min-w-0">
        <p id={id} className="text-body-sm font-medium text-ink">
          {label}
        </p>
        {descripcion && (
          <p className="mt-1 text-caption tracking-normal text-subtle">{descripcion}</p>
        )}
        {nota && (
          <p role="status" className="mt-2 text-caption tracking-normal text-muted">
            {nota}
          </p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={id}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-pill transition-colors duration-150 ease-boreal disabled:opacity-50',
          checked ? 'bg-accent' : 'bg-border',
        )}
      >
        <span
          className={cn(
            'absolute left-0.5 top-0.5 size-5 rounded-pill bg-bruma transition-transform duration-150 ease-boreal',
            checked ? 'translate-x-5' : 'translate-x-0',
          )}
        />
      </button>
    </div>
  )
}

/** Los botones de opción de una fila de preferencias (idioma, modo de lectura). */
function OpcionPreferencia({
  activa,
  onClick,
  lang,
  children,
}: {
  activa: boolean
  onClick: () => void
  lang?: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      lang={lang}
      onClick={onClick}
      aria-pressed={activa}
      className={cn(
        'inline-flex items-center gap-2 rounded-pill border px-3.5 py-1.5',
        'font-mono text-micro uppercase transition-colors duration-150 ease-boreal',
        activa
          ? 'border-accent-text text-accent-text'
          : 'border-border text-subtle hover:border-border-strong hover:text-ink',
      )}
    >
      {children}
    </button>
  )
}

/**
 * Idioma de la interfaz.
 *
 * Escribe la misma cookie que el selector de la landing (SelectorIdioma), así que lo
 * elegido antes de registrarse se conserva. Cada opción va escrita en su propio idioma.
 */
function SelectorDeIdioma() {
  const { idioma, setIdioma } = useIdioma()
  const t = useTextos(TEXTOS)

  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div className="flex items-center gap-3">
        <Globe aria-hidden="true" size={16} className="text-subtle" />
        <p className="text-body-sm text-ink">{t.idioma}</p>
      </div>
      <div role="group" aria-label={t.idioma} className="flex gap-2">
        {IDIOMAS.map((opcion) => (
          <OpcionPreferencia
            key={opcion}
            lang={opcion}
            activa={idioma === opcion}
            onClick={() => setIdioma(opcion)}
          >
            {NOMBRE_IDIOMA[opcion]}
          </OpcionPreferencia>
        ))}
      </div>
    </div>
  )
}

/**
 * Modo de lectura.
 *
 * El modo claro es obligatorio en el sistema (aula, informe impreso, captura para
 * compartir, astigmatismo), así que se puede elegir acá además de en el sidebar.
 */
function SelectorDeModo() {
  // Mismo hook que el toggle del sidebar, para que ambos controles estén sincronizados.
  const { theme, setTheme: elegir } = useTheme()
  const t = useTextos(TEXTOS)

  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div className="flex items-center gap-3">
        <Moon aria-hidden="true" size={16} className="text-subtle" />
        <p className="text-body-sm text-ink">{t.modoLectura}</p>
      </div>
      <div role="group" aria-label={t.modoLectura} className="flex gap-2">
        {(
          [
            { valor: 'dark' as const, label: t.noche, Icon: Moon },
            { valor: 'light' as const, label: t.papel, Icon: Sun },
          ]
        ).map(({ valor, label, Icon }) => (
          <OpcionPreferencia key={valor} activa={theme === valor} onClick={() => elegir(valor)}>
            <Icon aria-hidden="true" size={13} />
            {label}
          </OpcionPreferencia>
        ))}
      </div>
    </div>
  )
}

/**
 * "Avisarme cuando termine un análisis": notificación del sistema en ESTE dispositivo
 * (ver lib/notificaciones.ts). Prendido solo si la persona lo activó y el navegador dio
 * permiso: con el permiso revocado, el switch se ve apagado aunque esté guardado.
 */
function AvisoAnalisis() {
  const t = useTextos(TEXTOS)
  const activo = useSyncExternalStore(
    suscribirAviso,
    () => avisoActivado() && permisoActual() === 'granted',
    () => false,
  )
  const permiso = useSyncExternalStore<EstadoPermiso | null>(suscribirAviso, permisoActual, () => null)
  const [pidiendo, setPidiendo] = useState(false)

  const cambiar = async (valor: boolean) => {
    if (!valor) {
      guardarAviso(false)
      return
    }
    setPidiendo(true)
    try {
      const resultado = await pedirPermiso()
      if (resultado === 'granted') {
        guardarAviso(true)
        await mostrarPrueba(t.pruebaTitulo, t.pruebaCuerpo)
      }
    } finally {
      setPidiendo(false)
    }
  }

  let nota: React.ReactNode = null
  if (permiso === 'no-soportado') {
    nota = esIOS() ? (
      <>
        {t.avisoIos}{' '}
        <Link href="/instalar" className="text-accent-text underline-offset-4 hover:underline">
          {t.instalarApp}
        </Link>
      </>
    ) : (
      t.avisoNoSoportado
    )
  } else if (permiso === 'denied') {
    nota = t.avisoBloqueado
  }

  return (
    <ToggleSwitch
      id="cfg-aviso-analisis"
      checked={activo}
      onChange={cambiar}
      disabled={pidiendo || permiso === 'no-soportado' || permiso === 'denied'}
      label={t.avisoAnalisis}
      descripcion={t.avisoAnalisisBajada}
      nota={nota}
    />
  )
}

/**
 * "Novedades del producto": por email, guardado en la cuenta (PUT /me/preferences). Las
 * manda backend/send-news.ts. Hasta que carga el perfil se muestra como viene del
 * servidor; el cambio se ve al instante y se deshace si el guardado falla.
 */
function Novedades() {
  const t = useTextos(TEXTOS)
  const { profile, refreshProfile } = useAuth()
  const [local, setLocal] = useState<boolean | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(false)
  const activo = local ?? profile?.newsOptIn ?? false

  const cambiar = async (valor: boolean) => {
    setLocal(valor)
    setError(false)
    setGuardando(true)
    try {
      await apiFetch('/me/preferences', { method: 'PUT', body: { newsOptIn: valor } })
      await refreshProfile()
    } catch {
      setLocal(!valor)
      setError(true)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <ToggleSwitch
      id="cfg-novedades"
      checked={activo}
      onChange={cambiar}
      disabled={guardando || !profile}
      label={t.novedades}
      descripcion={t.novedadesBajada(profile?.email ?? null)}
      nota={error ? t.novedadesError : null}
    />
  )
}

export default function ConfiguracionPage() {
  const t = useTextos(TEXTOS)

  return (
    <div className="mx-auto flex w-full max-w-card flex-col gap-6 px-gutter py-12 md:px-6 md:py-16">
      <header className="flex flex-col gap-3">
        <p className="eyebrow">{t.eyebrow}</p>
        <h1 className="font-display text-h2-fluid text-display">{t.titulo}</h1>
      </header>

      <section className="panel flex flex-col gap-2">
        <h2 className="font-mono text-caption uppercase text-subtle">{t.cuenta}</h2>
        <div className="divide-y divide-border">
          <SelectorDeIdioma />
          <SelectorDeModo />
        </div>
      </section>

      <section className="panel flex flex-col gap-2">
        <h2 className="flex items-center gap-2 font-mono text-caption uppercase text-subtle">
          <Bell aria-hidden="true" size={14} className="text-accent-text" />
          {t.notificaciones}
        </h2>
        <div className="divide-y divide-border">
          <AvisoAnalisis />
          <Novedades />
        </div>
      </section>

      <section className="panel flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-body-sm font-medium text-ink">{t.cerrarSesion}</p>
          <p className="mt-1 text-caption tracking-normal text-subtle">{t.cerrarSesionBajada}</p>
        </div>
        <CerrarSesionBoton />
      </section>
    </div>
  )
}
