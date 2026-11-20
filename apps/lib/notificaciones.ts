'use client'

/**
 * "Avisarme cuando termine un análisis": una notificación del sistema (no un mail) cuando
 * la verificación termina y la persona está en otra pestaña o en otra app.
 *
 * Es local, sin servidor de push: el análisis lo espera esta misma pestaña
 * (/analizando), así que es ella la que avisa al terminar. Si se cierra la pestaña, el
 * análisis tampoco sigue, así que no hay nada que avisar.
 *
 * La preferencia se guarda por dispositivo (localStorage) y no en la cuenta, porque el
 * permiso de notificaciones también es por dispositivo y por navegador: activarlo en la
 * compu no puede prender nada en el celular.
 *
 * iPhone: Safari solo permite notificaciones a una web instalada en la pantalla de
 * inicio (iOS 16.4+). En una pestaña común `Notification` no existe, y Configuración
 * manda a /instalar.
 */

const CLAVE = 'aletheia-aviso-analisis'

const oyentes = new Set<() => void>()

/** Para `useSyncExternalStore`: avisa cuando cambia la preferencia o el permiso. */
export function suscribirAviso(fn: () => void) {
  oyentes.add(fn)
  return () => {
    oyentes.delete(fn)
  }
}

function avisarCambio() {
  for (const fn of oyentes) fn()
}

export type EstadoPermiso = NotificationPermission | 'no-soportado'

export function permisoActual(): EstadoPermiso {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'no-soportado'
  return Notification.permission
}

/** Si la persona lo activó en este dispositivo. Default: apagado hasta que lo pida. */
export function avisoActivado(): boolean {
  try {
    return localStorage.getItem(CLAVE) === '1'
  } catch {
    return false
  }
}

export function guardarAviso(activo: boolean) {
  try {
    if (activo) localStorage.setItem(CLAVE, '1')
    else localStorage.removeItem(CLAVE)
  } catch {
    // Storage bloqueado (ventana privada): el switch vuelve a apagado al recargar.
  }
  avisarCambio()
}

/**
 * Pide el permiso del navegador. Tiene que llamarse desde un click: Safari y Chrome
 * ignoran el pedido si no viene de un gesto de la persona.
 */
export async function pedirPermiso(): Promise<EstadoPermiso> {
  if (permisoActual() === 'no-soportado') return 'no-soportado'
  if (Notification.permission !== 'default') return Notification.permission
  const permiso = await Notification.requestPermission()
  avisarCambio()
  return permiso
}

/** Si el dispositivo es un iPhone/iPad (donde las notificaciones piden la app instalada). */
export function esIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

/**
 * Avisa que terminó un análisis, si corresponde: la persona lo activó, dio permiso y NO
 * está mirando la pestaña (si la está mirando, ya ve el resultado: avisar sería ruido).
 *
 * Usa el service worker cuando está: en Android y en la app instalada de iPhone,
 * `new Notification()` no existe o no hace nada, solo `registration.showNotification`.
 * Tocar la notificación abre el resultado (ver `notificationclick` en public/sw.js).
 */
export async function avisarAnalisisListo({
  titulo,
  cuerpo,
  url,
}: {
  titulo: string
  cuerpo: string
  url: string
}) {
  if (!avisoActivado() || permisoActual() !== 'granted') return
  if (document.visibilityState === 'visible') return
  await mostrar(titulo, cuerpo, url)
}

/** La notificación de prueba que sale al activar el aviso: confirma que llegan. */
export async function mostrarPrueba(titulo: string, cuerpo: string) {
  if (permisoActual() !== 'granted') return
  await mostrar(titulo, cuerpo, '/dashboard')
}

async function mostrar(titulo: string, cuerpo: string, url: string) {
  const opciones: NotificationOptions = {
    body: cuerpo,
    icon: '/icon/192.png',
    badge: '/icon/192.png',
    tag: 'aletheia-analisis',
    data: { url },
  }

  try {
    const registro = await navigator.serviceWorker?.getRegistration()
    if (registro) {
      await registro.showNotification(titulo, opciones)
      return
    }
  } catch {
    // Sin service worker (en desarrollo no se registra): cae a la API directa.
  }

  try {
    const n = new Notification(titulo, opciones)
    n.onclick = () => {
      window.focus()
      window.location.href = url
      n.close()
    }
  } catch {
    // Navegador que solo acepta notificaciones vía service worker: no hay más que hacer.
  }
}
