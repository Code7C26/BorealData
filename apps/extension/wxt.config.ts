import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'AletheIA',
    description:
      'Detector de noticias falsas con IA: verificación de fuentes y análisis de contenido.',
    // activeTab alcanza para leer la URL de la pestaña activa cuando el
    // usuario abre el popup, sin pedir acceso permanente a todas las webs.
    // storage guarda la sesión localmente en la extensión.
    permissions: ['activeTab', 'scripting', 'storage'],
    // Permite que SOLO páginas de tu dominio (el login web) puedan mandarle
    // mensajes a la extensión con chrome.runtime.sendMessage. TODO: cambiar
    // por el dominio real (debe coincidir con WEB_APP_URL en config.ts).
    externally_connectable: {
      matches: ['https://TU-DOMINIO-AQUI.web.app/*'],
    },
  },
});
