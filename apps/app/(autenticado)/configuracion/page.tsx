'use client'

import { useState } from 'react'
import { Bell, Globe, Moon, ShieldCheck, Sun } from 'lucide-react'
import { CerrarSesionBoton } from '@/components/cerrar-sesion-boton'
import { useTheme } from '@/lib/use-theme'
import { cn } from '@/lib/utils'

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

  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div className="flex items-center gap-3">
        <Moon aria-hidden="true" size={16} className="text-subtle" />
        <p className="text-body-sm text-ink">Modo de lectura</p>
      </div>
      <div role="group" aria-label="Modo de lectura" className="flex gap-2">
        {(
          [
            { valor: 'dark' as const, label: 'Noche', Icon: Moon },
            { valor: 'light' as const, label: 'Papel', Icon: Sun },
          ]
        ).map(({ valor, label, Icon }) => (
          <button
            key={valor}
            type="button"
            onClick={() => elegir(valor)}
            aria-pressed={theme === valor}
            className={cn(
              'inline-flex items-center gap-2 rounded-pill border px-3.5 py-1.5',
              'font-mono text-micro uppercase transition-colors duration-150 ease-boreal',
              theme === valor
                ? 'border-accent-text text-accent-text'
                : 'border-border text-subtle hover:border-border-strong hover:text-ink',
            )}
          >
            <Icon aria-hidden="true" size={13} />
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function ConfiguracionPage() {
  // Mock — sin persistencia real todavía, solo estado local de UI.
  // (El modo de lectura sí persiste: ver SelectorDeModo.)
  const [emailAnalisis, setEmailAnalisis] = useState(true)
  const [novedades, setNovedades] = useState(false)
  const [guardarHistorial, setGuardarHistorial] = useState(true)
  const [compartirAnonimo, setCompartirAnonimo] = useState(false)

  return (
    <div className="mx-auto flex w-full max-w-card flex-col gap-6 px-gutter py-12 md:px-6 md:py-16">
      <header className="flex flex-col gap-3">
        <p className="eyebrow">Preferencias</p>
        <h1 className="font-display text-h2-fluid text-display">Configuración</h1>
      </header>

      <section className="panel flex flex-col gap-2">
        <h2 className="font-mono text-caption uppercase text-subtle">Cuenta</h2>
        <div className="divide-y divide-border">
          <div className="flex items-center justify-between gap-4 py-4">
            <div className="flex items-center gap-3">
              <Globe aria-hidden="true" size={16} className="text-subtle" />
              <p className="text-body-sm text-ink">Idioma</p>
            </div>
            <span className="font-mono text-caption tracking-normal text-subtle">
              Español (Argentina)
            </span>
          </div>
          <SelectorDeModo />
        </div>
      </section>

      <section className="panel flex flex-col gap-2">
        <h2 className="flex items-center gap-2 font-mono text-caption uppercase text-subtle">
          <Bell aria-hidden="true" size={14} className="text-accent-text" />
          Notificaciones
        </h2>
        <div className="divide-y divide-border">
          <ToggleSwitch
            id="cfg-email-analisis"
            checked={emailAnalisis}
            onChange={setEmailAnalisis}
            label="Avisarme cuando termine un análisis"
            descripcion="Un email cuando AletheIA termina de verificar la nota."
          />
          <ToggleSwitch
            id="cfg-novedades"
            checked={novedades}
            onChange={setNovedades}
            label="Novedades del producto"
            descripcion="Cuando sumamos algo nuevo. Poco y espaciado."
          />
        </div>
      </section>

      <section className="panel flex flex-col gap-2">
        <h2 className="flex items-center gap-2 font-mono text-caption uppercase text-subtle">
          <ShieldCheck aria-hidden="true" size={14} className="text-accent-text" />
          Privacidad
        </h2>
        <div className="divide-y divide-border">
          <ToggleSwitch
            id="cfg-historial"
            checked={guardarHistorial}
            onChange={setGuardarHistorial}
            label="Guardar mi historial de verificaciones"
            descripcion="Si lo desactivás, los próximos análisis no quedan en tu cuenta."
          />
          <ToggleSwitch
            id="cfg-anonimo"
            checked={compartirAnonimo}
            onChange={setCompartirAnonimo}
            label="Compartir análisis de forma anónima"
            descripcion="Datos sin identificarte, para mejorar el motor."
          />
        </div>
      </section>

      <section className="panel flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-body-sm font-medium text-ink">Cerrar sesión</p>
          <p className="mt-1 text-caption tracking-normal text-subtle">
            Tu historial queda guardado; vas a tener que entrar de nuevo para verlo.
          </p>
        </div>
        <CerrarSesionBoton />
      </section>
    </div>
  )
}
