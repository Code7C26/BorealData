export default defineContentScript({
  // Tiene que matchear WXT_WEB_ORIGIN en apps/extension/.env — WXT resuelve
  // el manifest antes de bundlear, así que va literal (ver wxt.config.ts).
  // Sin puerto: los match patterns de Chrome no lo soportan en el host (el
  // puerto se ignora en el matching igual, pero incluirlo explícito hace que
  // la API de registro dinámico de content scripts — la que usa WXT para el
  // hot-reload en dev — tire InvalidMatchPattern).
  matches: ['http://localhost/*'],
  main() {
    // La web (apps/lib/extension-bridge.ts) hace postMessage con la sesión
    // de Firebase cada vez que cambia (login, logout, refresh de token).
    // Este content script corre inyectado en esa misma página y solo la
    // reenvía al background, que es quien la persiste.
    window.addEventListener('message', (event) => {
      if (event.source !== window) return;
      if (event.data?.source !== 'aletheia-web') return;

      browser.runtime.sendMessage({
        type: 'ALETHEIA_AUTH_SYNC',
        payload: event.data,
      });
    });
  },
});
