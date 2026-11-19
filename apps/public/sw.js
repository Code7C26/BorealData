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
const VERSION = 'v1'
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

// Solo las navegaciones: todo lo demás (API, chunks, imágenes) va directo a la red sin
// pasar por acá. Si la red falla, la página sin conexión.
self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return
  event.respondWith(
    fetch(event.request).catch(() => caches.match(OFFLINE_URL).then((r) => r || Response.error())),
  )
})
