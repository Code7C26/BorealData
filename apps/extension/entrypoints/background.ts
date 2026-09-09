/**
 * La extensión no tiene login propio: escucha la sesión que ya inició la web
 * (ver apps/lib/extension-bridge.ts + entrypoints/auth-bridge.content.ts) y
 * la guarda acá para que el popup pueda usarla contra el backend.
 */

interface StoredAuth {
  idToken: string;
  refreshToken: string;
  /** String parseable por `new Date()` — momento de vencimiento del idToken. */
  expirationTime: string;
  uid: string;
  email: string | null;
}

type AuthSyncPayload =
  | {
      source: 'aletheia-web';
      type: 'AUTH_STATE';
      idToken: string;
      refreshToken: string;
      expirationTime: string;
      uid: string;
      email: string | null;
    }
  | { source: 'aletheia-web'; type: 'AUTH_LOGOUT' };

type ExtensionMessage =
  | { type: 'ALETHEIA_AUTH_SYNC'; payload: AuthSyncPayload }
  | { type: 'GET_ID_TOKEN' };

const STORAGE_KEY = 'aletheia_auth';
// Refresca un poco antes de que venza en vez de esperar al 401 del backend.
const EXPIRY_BUFFER_MS = 60_000;

async function getStoredAuth(): Promise<StoredAuth | null> {
  const result = await browser.storage.local.get(STORAGE_KEY);
  return (result[STORAGE_KEY] as StoredAuth | undefined) ?? null;
}

async function setStoredAuth(auth: StoredAuth | null): Promise<void> {
  if (auth) {
    await browser.storage.local.set({ [STORAGE_KEY]: auth });
  } else {
    await browser.storage.local.remove(STORAGE_KEY);
  }
}

function estaVigente(auth: StoredAuth): boolean {
  return new Date(auth.expirationTime).getTime() - EXPIRY_BUFFER_MS > Date.now();
}

/** Refresca el ID token por REST (sin cargar el SDK completo de Firebase en el service worker). */
async function refrescarToken(auth: StoredAuth): Promise<StoredAuth | null> {
  const apiKey = import.meta.env.WXT_FIREBASE_API_KEY;
  if (!apiKey) {
    console.error('Falta WXT_FIREBASE_API_KEY en apps/extension/.env — no se puede refrescar la sesión.');
    return null;
  }

  try {
    const res = await fetch(`https://securetoken.googleapis.com/v1/token?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(auth.refreshToken)}`,
    });
    if (!res.ok) return null;

    const data = (await res.json()) as {
      id_token: string;
      refresh_token: string;
      expires_in: string;
    };
    const actualizado: StoredAuth = {
      idToken: data.id_token,
      refreshToken: data.refresh_token,
      expirationTime: new Date(Date.now() + Number(data.expires_in) * 1000).toISOString(),
      uid: auth.uid,
      email: auth.email,
    };
    await setStoredAuth(actualizado);
    return actualizado;
  } catch (err) {
    console.error('No se pudo refrescar la sesión de AletheIA:', err);
    return null;
  }
}

async function handleAuthSync(payload: AuthSyncPayload) {
  if (payload.type === 'AUTH_LOGOUT') {
    await setStoredAuth(null);
    return { ok: true };
  }
  await setStoredAuth({
    idToken: payload.idToken,
    refreshToken: payload.refreshToken,
    expirationTime: payload.expirationTime,
    uid: payload.uid,
    email: payload.email,
  });
  return { ok: true };
}

async function handleGetIdToken() {
  const auth = await getStoredAuth();
  if (!auth) return { error: 'NEEDS_LOGIN' as const };
  if (estaVigente(auth)) return { idToken: auth.idToken };

  const refrescado = await refrescarToken(auth);
  if (!refrescado) {
    await setStoredAuth(null);
    return { error: 'NEEDS_LOGIN' as const };
  }
  return { idToken: refrescado.idToken };
}

export default defineBackground(() => {
  browser.runtime.onMessage.addListener((message: ExtensionMessage) => {
    if (message?.type === 'ALETHEIA_AUTH_SYNC') return handleAuthSync(message.payload);
    if (message?.type === 'GET_ID_TOKEN') return handleGetIdToken();
  });
});
