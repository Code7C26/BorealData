'use client'

import { useSyncExternalStore } from 'react'
import { ArrowUpRight, X } from 'lucide-react'
import { LogoMark } from '@/components/logo'
import { LogoChrome } from '@/components/logo-chrome'
import { URL_CHROME_WEB_STORE } from '@/lib/extension-store'
import { traducciones } from '@/lib/idioma'
import { useTextos } from '@/lib/use-idioma'

const TEXTOS = traducciones({
  es: {
    eyebrow: 'Extensión de Chrome',
    titulo: 'Llevá AletheIA a tu navegador',
    bajada:
      'Se abre al costado de cualquier nota y la verifica sin copiar el enlace. Usa esta misma sesión: no hay que volver a entrar.',
    agregar: 'Agregar a Chrome',
    yaLaTengo: 'Ya la tengo',
  },
  en: {
    eyebrow: 'Chrome extension',
    titulo: 'Take AletheIA to your browser',
    bajada:
      "It opens next to any article and checks it without copying the link. It uses this same session: no need to sign in again.",
    agregar: 'Add to Chrome',
    yaLaTengo: 'I already have it',
  },
})

const CLAVE_OCULTO = 'aletheia-banner-extension-oculto'

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
 * La invitación a instalar la extensión, en el dashboard.
 *
 * Solo en pantallas md+: la Chrome Web Store no instala nada en el celular, y
 * mostrarle el botón a quien no puede usarlo es ruido. "Ya la tengo" la esconde
 * en este navegador (localStorage, que puede fallar en una ventana privada: en
 * ese caso el banner simplemente vuelve a aparecer).
 *
 * En el servidor cuenta como oculto, así quien ya la cerró no la ve parpadear
 * en cada carga.
 */
export function ExtensionBanner() {
  const t = useTextos(TEXTOS)
  const oculto = useSyncExternalStore(suscribir, leerOculto, () => true)

  if (oculto) return null

  return (
    <section
      aria-labelledby="extension-banner-title"
      className="relative hidden overflow-hidden rounded-2xl border border-border bg-surface md:block"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-pill blur-3xl"
        style={{ background: 'radial-gradient(circle, var(--aurora-a), transparent 70%)' }}
      />

      <button
        type="button"
        onClick={ocultar}
        aria-label={t.yaLaTengo}
        className="absolute top-3 right-3 flex size-8 items-center justify-center rounded-pill text-subtle transition-colors duration-150 ease-boreal hover:bg-surface-sunk hover:text-ink"
      >
        <X aria-hidden="true" size={16} />
      </button>

      <div className="relative flex items-center gap-6 p-6 pr-14">
        {/* El ícono de la app con la insignia de Chrome encima: "esto, en Chrome". */}
        <span className="relative flex size-14 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-sunk">
          <LogoMark className="size-8" />
          <LogoChrome className="absolute -right-1.5 -bottom-1.5 size-6 ring-2 ring-surface" />
        </span>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="font-mono text-micro uppercase text-accent-text">{t.eyebrow}</p>
          <h2 id="extension-banner-title" className="font-display text-[1.25rem] leading-tight font-semibold text-display">
            {t.titulo}
          </h2>
          <p className="max-w-texto text-body-sm text-muted">{t.bajada}</p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <a href={URL_CHROME_WEB_STORE} target="_blank" rel="noopener noreferrer" className="btn-primary">
            <LogoChrome />
            {t.agregar}
            <ArrowUpRight aria-hidden="true" size={16} />
          </a>
          <button
            type="button"
            onClick={ocultar}
            className="font-mono text-micro uppercase text-subtle transition-colors duration-150 ease-boreal hover:text-ink"
          >
            {t.yaLaTengo}
          </button>
        </div>
      </div>
    </section>
  )
}
