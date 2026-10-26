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
    // Nombre y descripción salen de public/_locales/{es,en}/messages.json: es lo que
    // muestran la Chrome Web Store y chrome://extensions, y eso sigue el idioma del
    // NAVEGADOR (lo resuelve Chrome, no la extensión). Todo lo demás —el panel y el menú
    // del clic derecho— sigue al idioma elegido en la web (ver lib/idioma.ts).
    default_locale: 'es',
    name: '__MSG_extName__',
    description: '__MSG_extDescription__',
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
      // "Analizar con AletheIA" con clic derecho sobre una imagen, una
      // selección o la página (ver crearMenuContextual en background.ts).
      // Bonus técnico: un clic en un ítem de menú contextual GARANTIZA el
      // permiso activeTab sobre esa pestaña, que es justo lo que necesita
      // tabs.captureVisibleTab.
      'contextMenus',
    ],
    // Sin esto, el fetch del popup/background contra el backend y contra el
    // endpoint de refresh de Firebase quedaría sujeto a CORS del browser.
    //
    // Los dominios sociales van declarados de entrada porque son el caso que
    // justifica la captura (el scraper del servidor solo ve el muro de login)
    // y así capturar ahí no dispara ningún diálogo de permiso. Tienen que
    // coincidir con PLATAFORMAS_POR_DOMINIO en lib/platform.ts.
    host_permissions: [
      `${API_URL}/*`,
      'https://securetoken.googleapis.com/*',
      '*://*.facebook.com/*',
      '*://*.instagram.com/*',
      '*://*.x.com/*',
      '*://*.twitter.com/*',
      '*://web.whatsapp.com/*',
      '*://*.tiktok.com/*',
    ],
    // El resto de la web se pide EN EL MOMENTO, con el clic del usuario sobre
    // "Analizar lo que estás viendo" (ver asegurarPermisoDeCaptura en el
    // panel). Pedir `*://*/*` de entrada asusta al instalar y complica la
    // revisión de la Web Store; como permiso opcional, el usuario lo concede
    // para el sitio donde realmente lo necesita. Ver sección 6 del brief.
    optional_host_permissions: ['*://*/*'],
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
