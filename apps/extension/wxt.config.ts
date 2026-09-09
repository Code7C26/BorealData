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
});
