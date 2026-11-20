'use client'

import { useSyncExternalStore } from 'react'
import { BellRing, X } from 'lucide-react'
import { BotonInstalarApp, useEstadoInstalacion } from '@/components/boton-instalar-app'
import { LogoMark } from '@/components/logo'
import { traducciones } from '@/lib/idioma'
import { useTextos } from '@/lib/use-idioma'

const TEXTOS = traducciones({
  es: {
    eyebrow: 'App para el celular',
    titulo: 'Tené AletheIA en tu pantalla de inicio',
    bajada: 'Abrila con un toque y recibí un aviso cuando termina cada verificación. Con esta misma cuenta.',
    ahoraNo: 'Ahora no',
  },
  en: {
    eyebrow: 'Phone app',
    titulo: 'Keep AletheIA on your home screen',
    bajada: 'Open it with one tap and get notified when each check is done. With this same account.',
    ahoraNo: 'Not now',
  },
})

const CLAVE_OCULTO = 'aletheia-banner-app-oculto'

/** Lo elegido en esta pestaña: con el storage bloqueado la escritura falla y el cierre igual tiene que andar. */
let ocultoEnMemoria = false
const oyentes = new Set<() => void>()

function leerOculto(): boolean {
  if (ocultoEnMemoria) return true
  try {
    return localStorage.getItem(CLAVE_OCULTO) === '1'
  } catch {
    return false
  }
}

function suscribir(avisar: () => void) {
  oyentes.add(avisar)
  return () => {
    oyentes.delete(avisar)
  }
}

function ocultar() {
  ocultoEnMemoria = true
  try {
    localStorage.setItem(CLAVE_OCULTO, '1')
  } catch {}
  for (const avisar of oyentes) avisar()
}

/**
 * La invitación a instalar la app, en el dashboard. Es el espejo de ExtensionBanner:
 * aquel solo se ve en computadora (la Chrome Web Store no instala nada en el celular) y
 * este solo en el celular, así nunca aparecen los dos a la vez.
 *
 * No se muestra si ya se está usando como app instalada, ni después de "Ahora no"
 * (guardado en este navegador). En el servidor cuenta como oculto, así no parpadea.
 */
export function AppBanner() {
  const t = useTextos(TEXTOS)
  const oculto = useSyncExternalStore(suscribir, leerOculto, () => true)
  const estado = useEstadoInstalacion()

  if (oculto || estado === 'instalada' || estado === 'cargando') return null

  return (
    <section
      aria-labelledby="app-banner-title"
      className="relative overflow-hidden rounded-2xl border border-border bg-surface md:hidden"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-pill blur-3xl"
        style={{ background: 'radial-gradient(circle, var(--aurora-a), transparent 70%)' }}
      />

      <button
        type="button"
        onClick={ocultar}
        aria-label={t.ahoraNo}
        className="absolute top-3 right-3 flex size-8 items-center justify-center rounded-pill text-subtle transition-colors duration-150 ease-boreal hover:bg-surface-sunk hover:text-ink"
      >
        <X aria-hidden="true" size={16} />
      </button>

      <div className="relative flex flex-col gap-4 p-5 pr-12">
        <div className="flex items-center gap-3">
          {/* El ícono tal como queda en la pantalla de inicio, con el aviso encima. */}
          <span className="relative flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#0B100F]">
            <LogoMark className="size-7" />
            <span className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-pill bg-accent text-bruma ring-2 ring-surface">
              <BellRing aria-hidden="true" size={11} />
            </span>
          </span>
          <p className="font-mono text-micro uppercase text-accent-text">{t.eyebrow}</p>
        </div>

        <div className="flex flex-col gap-1">
          <h2 id="app-banner-title" className="font-display text-[1.2rem] leading-tight font-semibold text-display">
            {t.titulo}
          </h2>
          <p className="text-body-sm text-muted">{t.bajada}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <BotonInstalarApp />
          <button
            type="button"
            onClick={ocultar}
            className="font-mono text-micro uppercase text-subtle transition-colors duration-150 ease-boreal hover:text-ink"
          >
            {t.ahoraNo}
          </button>
        </div>
      </div>
    </section>
  )
}
