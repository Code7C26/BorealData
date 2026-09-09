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
    permissions: ['activeTab'],
  },
});
