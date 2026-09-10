import { defineConfig } from 'wxt';

// Tiene que matchear WXT_API_URL en apps/extension/.env — se repite acá
// literal porque el manifest se resuelve antes de que WXT termine de cargar
// el .env para el bundle en runtime. El origen de la web (WXT_WEB_ORIGIN) se
// declara aparte, como `matches` del content script en
// entrypoints/auth-bridge.content.ts.
const API_URL = 'http://localhost:4000';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'AletheIA',
    description:
      'Detector de noticias falsas con IA: verificación de fuentes y análisis de contenido.',
    // Sin entrypoint de popup, MV3 no genera un ícono en la barra de
    // herramientas por sí solo — lo declaramos vacío para que exista el
    // botón y background.ts pueda abrir el side panel al clickearlo.
    action: {},
    permissions: [
      // activeTab alcanza para leer la URL de la pestaña activa cuando el
      // usuario abre el popup, sin pedir acceso permanente a todas las webs.
      'activeTab',
      // Para guardar/leer la sesión sincronizada desde la web (ver
      // entrypoints/background.ts).
      'storage',
    ],
    // Sin esto, el fetch del popup/background contra el backend y contra el
    // endpoint de refresh de Firebase quedaría sujeto a CORS del browser.
    host_permissions: [`${API_URL}/*`, 'https://securetoken.googleapis.com/*'],
  },
  dev: {
    server: {
      // Por defecto WXT usa el primer puerto libre entre 3000 y 3010,
      // pisando el 3000 de la web (Next.js) — en Windows "localhost"
      // resuelve a la loopback IPv6 (::1), que WXT sí llega a bindear
      // aunque Next.js ya tenga tomado el 3000 en IPv4/IPv6 wildcard,
      // y el browser termina cayendo en el dev server de la extensión
      // en vez de en la web. Puerto fijo, fuera del rango 3000-3010.
      port: 3300,
    },
  },
});
