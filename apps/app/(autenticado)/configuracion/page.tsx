'use client'

import { useState } from 'react'
import { Bell, Globe, Moon, ShieldCheck, Sun } from 'lucide-react'
import { CerrarSesionBoton } from '@/components/cerrar-sesion-boton'
import { IDIOMAS, NOMBRE_IDIOMA, traducciones } from '@/lib/idioma'
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
    emailAnalisis: 'Avisarme cuando termine un análisis',
    emailAnalisisBajada: 'Un email cuando AletheIA termina de verificar la nota.',
    novedades: 'Novedades del producto',
    novedadesBajada: 'Cuando sumamos algo nuevo. Poco y espaciado.',
    privacidad: 'Privacidad',
    historial: 'Guardar mi historial de verificaciones',
    historialBajada: 'Si lo desactivás, los próximos análisis no quedan en tu cuenta.',
    anonimo: 'Compartir análisis de forma anónima',
    anonimoBajada: 'Datos sin identificarte, para mejorar el motor.',
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
    emailAnalisis: 'Let me know when an analysis is done',
    emailAnalisisBajada: 'An email when AletheIA finishes checking the article.',
    novedades: 'Product news',
    novedadesBajada: 'When we add something new. Rarely and spaced out.',
    privacidad: 'Privacy',
    historial: 'Save my check history',
    historialBajada: "If you turn it off, your next analyses won't stay in your account.",
    anonimo: 'Share analyses anonymously',
    anonimoBajada: 'Data that does not identify you, to improve the engine.',
    cerrarSesion: 'Log out',
    cerrarSesionBajada: "Your history stays saved; you'll need to log in again to see it.",
  },
})

function ToggleSwitch({
  checked,
  onChange,
  label,
  descripcion,
  id,
}: {
  checked: boolean
  onChange: (valor: boolean) => void
  label: string
  descripcion?: string
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
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={id}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-pill transition-colors duration-150 ease-boreal',
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
 * Antes esta fila decía "Español (Argentina)" y no se podía tocar. Ahora es el control
 * real, el mismo que tiene la landing para quien todavía no tiene cuenta (ver
 * SelectorIdioma): los dos escriben la misma cookie, así que lo que se eligió antes de
 * registrarse sigue elegido acá. Cada opción va escrita en su propio idioma.
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
 * Antes esta fila decía "Oscuro" y no hacía nada. Ahora es el control real: el
 * modo claro es obligatorio en el sistema (aula, informe impreso, captura para
 * compartir, astigmatismo), así que tiene que poder elegirse acá y no solo
 * desde el ícono del sidebar.
 */
function SelectorDeModo() {
  // Mismo hook que el toggle de la barra: antes acá estaba el mismo useState +
  // useEffect copiado, y los dos controles podían quedar diciendo cosas distintas.
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

export default function ConfiguracionPage() {
  const t = useTextos(TEXTOS)
  // Mock — sin persistencia real todavía, solo estado local de UI.
  // (El idioma y el modo de lectura sí persisten: ver SelectorDeIdioma y SelectorDeModo.)
  const [emailAnalisis, setEmailAnalisis] = useState(true)
  const [novedades, setNovedades] = useState(false)
  const [guardarHistorial, setGuardarHistorial] = useState(true)
  const [compartirAnonimo, setCompartirAnonimo] = useState(false)

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
          <ToggleSwitch
            id="cfg-email-analisis"
            checked={emailAnalisis}
            onChange={setEmailAnalisis}
            label={t.emailAnalisis}
            descripcion={t.emailAnalisisBajada}
          />
          <ToggleSwitch
            id="cfg-novedades"
            checked={novedades}
            onChange={setNovedades}
            label={t.novedades}
            descripcion={t.novedadesBajada}
          />
        </div>
      </section>

      <section className="panel flex flex-col gap-2">
        <h2 className="flex items-center gap-2 font-mono text-caption uppercase text-subtle">
          <ShieldCheck aria-hidden="true" size={14} className="text-accent-text" />
          {t.privacidad}
        </h2>
        <div className="divide-y divide-border">
          <ToggleSwitch
            id="cfg-historial"
            checked={guardarHistorial}
            onChange={setGuardarHistorial}
            label={t.historial}
            descripcion={t.historialBajada}
          />
          <ToggleSwitch
            id="cfg-anonimo"
            checked={compartirAnonimo}
            onChange={setCompartirAnonimo}
            label={t.anonimo}
            descripcion={t.anonimoBajada}
          />
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
