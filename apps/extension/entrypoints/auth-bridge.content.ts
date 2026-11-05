/**
 * Match patterns de la web a partir de WXT_WEB_ORIGIN (.env en dev,
 * .env.production en build). Sin puerto: los match patterns de Chrome no lo
 * soportan en el host (se ignora en el matching igual, pero incluirlo hace
 * que la API de registro dinámico de content scripts — la que usa WXT para el
 * hot-reload en dev — tire InvalidMatchPattern). En producción se suma la
 * variante www, que Traefik también sirve.
 */
function matchesDeLaWeb(origen: string): string[] {
  const { protocol, hostname } = new URL(origen);
  if (hostname === 'localhost') return [`${protocol}//${hostname}/*`];
  const raiz = hostname.replace(/^www\./, '');
  return [`${protocol}//${raiz}/*`, `${protocol}//www.${raiz}/*`];
}

export default defineContentScript({
  matches: matchesDeLaWeb(import.meta.env.WXT_WEB_ORIGIN),
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
