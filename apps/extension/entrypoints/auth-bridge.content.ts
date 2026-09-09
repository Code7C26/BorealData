export default defineContentScript({
  // Tiene que matchear WXT_WEB_ORIGIN en apps/extension/.env — WXT resuelve
  // el manifest antes de bundlear, así que va literal (ver wxt.config.ts).
  matches: ['http://localhost:3000/*'],
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
