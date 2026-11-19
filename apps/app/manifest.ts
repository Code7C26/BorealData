import type { MetadataRoute } from 'next'

/**
 * Manifest de la PWA: es lo que permite "Agregar a pantalla de inicio" desde Safari
 * (iOS) y "Instalar app" desde Chrome/Edge, sin pasar por ninguna tienda. Con
 * `display: standalone` la app abre en su propia ventana, sin la barra del navegador.
 *
 * Safari no usa estos íconos para la pantalla de inicio: toma `app/apple-icon.png`
 * (Next lo publica como `apple-touch-icon`). Los de acá son para Android y escritorio.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'AletheIA — Boreal Data',
    short_name: 'AletheIA',
    description:
      'Verificación de noticias que se deja auditar: fuentes, posturas y razonamiento hasta el veredicto.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    lang: 'es',
    background_color: '#0b100f',
    theme_color: '#0b100f',
    icons: [
      { src: '/icon/192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon/512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
