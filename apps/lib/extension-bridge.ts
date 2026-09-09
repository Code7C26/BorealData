import { getIdTokenResult, type User } from "firebase/auth";

/**
 * Puente de sesión hacia la extensión de Chrome: la extensión no tiene login
 * propio (ver apps/extension/entrypoints/content/auth-bridge.ts), así que
 * cuando el usuario está logueado en la web le mandamos el token por
 * postMessage. Un content script de la extensión, inyectado en este mismo
 * origen, escucha este mensaje y lo reenvía a su background script.
 *
 * postMessage con targetOrigin = window.location.origin: solo lo puede leer
 * un listener corriendo en esta misma página (el content script de la
 * extensión se inyecta ahí), nunca viaja a otro origen.
 */
export const ALETHEIA_AUTH_MESSAGE_SOURCE = "aletheia-web";

export async function broadcastAuthState(user: User | null) {
  if (typeof window === "undefined") return;

  if (!user) {
    window.postMessage(
      { source: ALETHEIA_AUTH_MESSAGE_SOURCE, type: "AUTH_LOGOUT" },
      window.location.origin
    );
    return;
  }

  try {
    const tokenResult = await getIdTokenResult(user);
    window.postMessage(
      {
        source: ALETHEIA_AUTH_MESSAGE_SOURCE,
        type: "AUTH_STATE",
        idToken: tokenResult.token,
        refreshToken: user.refreshToken,
        expirationTime: tokenResult.expirationTime,
        uid: user.uid,
        email: user.email,
      },
      window.location.origin
    );
  } catch (err) {
    console.error("No se pudo sincronizar la sesión con la extensión:", err);
  }
}
