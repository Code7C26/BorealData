export default defineBackground(() => {
  // La web (una vez tenga el login real) le va a mandar un mensaje así:
  //   chrome.runtime.sendMessage(EXTENSION_ID, { type: 'ALETHEIA_AUTH', token, user })
  // Solo funciona desde el dominio declarado en `externally_connectable`
  // (wxt.config.ts) — cualquier otra página es ignorada por el navegador
  // antes de que este código se ejecute.
  browser.runtime.onMessageExternal.addListener((message, _sender, sendResponse) => {
    if (message?.type === 'ALETHEIA_AUTH' && typeof message.token === 'string') {
      browser.storage.local
        .set({ auth: { token: message.token, user: message.user ?? undefined } })
        .then(() => sendResponse({ ok: true }))
        .catch(() => sendResponse({ ok: false }));
      return true; // mantiene el canal abierto para la respuesta async
    }
    return false;
  });
});
