/*
 * Service worker de AletheIA.
 *
 * Existe para que la web sea instalable como app (Android, Chrome y Edge de escritorio
 * lo piden para ofrecer "Instalar") y para no mostrar el dinosaurio cuando no hay red.
 * NO cachea la app: cada análisis necesita conexión igual, y un caché viejo de Next es
 * la forma más fácil de servir HTML que apunta a chunks que ya no existen.
 *
 * Si cambia este archivo, subir VERSION: el navegador lo compara byte a byte para
 * saber que hay una versión nueva.
 */
const VERSION = 'v2'
const CACHE = `aletheia-offline-${VERSION}`
const OFFLINE_URL = '/offline.html'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.add(new Request(OFFLINE_URL, { cache: 'reload' })))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((claves) =>
        Promise.all(
          claves.filter((c) => c.startsWith('aletheia-offline-') && c !== CACHE).map((c) => caches.delete(c)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

// Tocar la notificación de "análisis terminado" (lib/notificaciones.ts) abre el resultado:
// si ya hay una pestaña de AletheIA, la enfoca y la lleva ahí; si no, abre una.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const destino = new URL(event.notification.data?.url || '/', self.location.origin).href
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((ventanas) => {
      const abierta = ventanas.find((v) => new URL(v.url).origin === self.location.origin)
      // navigate() solo anda en pestañas que este service worker controla: si falla, se abre una nueva.
      if (abierta) {
        return abierta
          .focus()
          .then((v) => v.navigate(destino))
          .catch(() => self.clients.openWindow(destino))
      }
      return self.clients.openWindow(destino)
    }),
  )
})

// Solo las navegaciones: todo lo demás (API, chunks, imágenes) va directo a la red sin
// pasar por acá. Si la red falla, la página sin conexión.
self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return
  event.respondWith(
    fetch(event.request).catch(() => caches.match(OFFLINE_URL).then((r) => r || Response.error())),
  )
})
