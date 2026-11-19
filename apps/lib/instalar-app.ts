'use client'

/**
 * Estado de "instalar la app" (PWA), como store externo para `useSyncExternalStore`.
 *
 * Cada plataforma instala distinto, y la página /instalar muestra lo que corresponde:
 *  - `prompt`: Chrome/Edge (Android y escritorio) dispararon `beforeinstallprompt`.
 *    Guardamos el evento y el botón "Instalar" abre el cartel nativo: un toque.
 *  - `ios`: Safari (y cualquier navegador en iPhone/iPad) NO tiene API de instalación.
 *    Solo se puede explicar: Compartir → Agregar a pantalla de inicio.
 *  - `in-app`: el navegador interno de Instagram, Facebook, etc. Desde ahí no se puede
 *    instalar nada: hay que abrir el link en Safari o Chrome.
 *  - `manual`: un navegador sin el evento (Firefox, Samsung Internet a veces, o Chrome
 *    antes de que lo dispare). Se explica el menú del navegador.
 *  - `instalada`: ya se está usando como app (display-mode standalone).
 */

export type EstadoInstalacion = 'cargando' | 'prompt' | 'ios' | 'in-app' | 'manual' | 'instalada'

/** El evento no está en los tipos del DOM porque no es estándar (solo Chromium). */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let eventoDiferido: BeforeInstallPromptEvent | null = null
let instaladaRecien = false
const oyentes = new Set<() => void>()

function avisar() {
  for (const fn of oyentes) fn()
}

// Se registra al cargar el módulo y no al montar el componente: Chrome dispara el evento
// una sola vez, apenas carga la página, y si nadie lo escuchaba se pierde.
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    // Sin esto Chrome en Android muestra su propia mini-barra además de nuestro botón.
    e.preventDefault()
    eventoDiferido = e as BeforeInstallPromptEvent
    avisar()
  })
  window.addEventListener('appinstalled', () => {
    eventoDiferido = null
    instaladaRecien = true
    avisar()
  })
}

function esStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // Safari en iOS no soporta display-mode en todas las versiones: tiene su propia bandera.
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

function esIOS(): boolean {
  const ua = navigator.userAgent
  // El iPad con iPadOS 13+ se presenta como Mac; lo delata la pantalla táctil.
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

function esNavegadorInterno(): boolean {
  return /FBAN|FBAV|Instagram|Line\/|TikTok|musical_ly|Twitter/i.test(navigator.userAgent)
}

function leer(): EstadoInstalacion {
  if (instaladaRecien || esStandalone()) return 'instalada'
  if (esNavegadorInterno()) return 'in-app'
  if (eventoDiferido) return 'prompt'
  if (esIOS()) return 'ios'
  return 'manual'
}

function suscribir(fn: () => void) {
  oyentes.add(fn)
  return () => {
    oyentes.delete(fn)
  }
}

export const storeInstalacion = {
  suscribir,
  leer,
  leerServidor: (): EstadoInstalacion => 'cargando',
}

/** Abre el cartel nativo de instalación. Devuelve si la persona aceptó. */
export async function pedirInstalacion(): Promise<boolean> {
  const evento = eventoDiferido
  if (!evento) return false
  await evento.prompt()
  const { outcome } = await evento.userChoice
  // El evento se usa una sola vez: aceptado o no, Chrome no deja volver a llamar prompt().
  eventoDiferido = null
  if (outcome === 'accepted') instaladaRecien = true
  avisar()
  return outcome === 'accepted'
}

/** Registra el service worker. Solo en producción: en dev cachearía cosas a medio compilar. */
export function registrarServiceWorker() {
  if (process.env.NODE_ENV !== 'production') return
  if (!('serviceWorker' in navigator)) return
  navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).catch(() => {
    // Sin service worker la web anda igual; solo pierde la instalación en algunos navegadores.
  })
}
