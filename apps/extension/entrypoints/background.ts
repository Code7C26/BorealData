/**
 * La extensión no tiene login propio: escucha la sesión que ya inició la web
 * (ver apps/lib/extension-bridge.ts + entrypoints/auth-bridge.content.ts) y
 * la guarda acá para que el side panel pueda usarla contra el backend.
 *
 * El análisis (POST /analyze) también corre acá y no en el panel — ver
 * "Análisis en background" más abajo — para que sobreviva al cierre del
 * panel al cambiar de pestaña (ver tabs.onActivated, al final del archivo).
 */

import type { AnalysisResult, BackendAnalyzeResponse } from '@/lib/analysis';
import { mapBackendResult } from '@/lib/analysis';

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
  | { type: 'GET_ID_TOKEN' }
  | { type: 'ANALYZE_URL'; url: string }
  | { type: 'GET_CACHE_STATE'; url: string };

const STORAGE_KEY = 'aletheia_auth';
// Refresca un poco antes de que venza en vez de esperar al 401 del backend.
const EXPIRY_BUFFER_MS = 60_000;

const API_URL = import.meta.env.WXT_API_URL;

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

/**
 * Análisis en background
 * -----------------------
 * Antes el fetch a POST /analyze vivía en el panel (ver git history de
 * entrypoints/sidepanel/App.tsx). El problema: el panel se cierra solo al
 * cambiar de pestaña (ver tabs.onActivated más abajo, es a propósito), y
 * cerrarlo destruye su documento — cualquier fetch en curso ahí se aborta.
 * El usuario perdía el análisis que estaba esperando apenas cambiaba de
 * pantalla un segundo.
 *
 * La solución: el fetch corre acá, en el service worker, que no se destruye
 * cuando el panel se cierra. Chrome además extiende la vida del service
 * worker mientras haya un fetch en curso iniciado por él (ver "Extend a
 * service worker's lifetime with fetch" en la doc de Chrome for MV3), así
 * que un análisis largo (scraping + Gemini) no se corta por inactividad.
 *
 * El resultado se cachea por URL exacta en storage.local — espejo del
 * caché que ya tiene el backend por usuario+URL (ver backend/src/routes/
 * analyze.ts), pero acá evita incluso el viaje de red: si el panel se
 * reabre sobre una pestaña ya analizada, el resultado sale del storage
 * local, instantáneo, sin pegarle a /analyze de nuevo.
 *
 * Si el análisis termina mientras el panel está cerrado, queda marcado
 * "no leído" y el ícono de la extensión muestra un badge con la cantidad
 * — se limpia solo cuando el panel vuelve a abrirse sobre esa URL.
 */

interface CacheEntry {
  result: AnalysisResult;
  analyzedAt: string;
}

type AnalysisCache = Record<string, CacheEntry>;

const CACHE_KEY = 'aletheia_analysis_cache';
const UNREAD_KEY = 'aletheia_unread_urls';
// Tope prudente para que storage.local no crezca sin límite con el uso normal.
const MAX_CACHE_ENTRIES = 60;
const BADGE_COLOR = '#2563eb';

// Solo en memoria: sirve para no disparar dos fetches en paralelo para la
// misma URL (p.ej. dos pestañas con la misma nota abiertas a la vez) y para
// que GET_CACHE_STATE pueda decir "loading" mientras se resuelve. Se pierde
// si el service worker se reinicia a mitad de un análisis — en ese caso el
// próximo intento simplemente arranca de nuevo.
const inFlight = new Map<string, Promise<AnalysisResult>>();

async function getAnalysisCache(): Promise<AnalysisCache> {
  const result = await browser.storage.local.get(CACHE_KEY);
  return (result[CACHE_KEY] as AnalysisCache | undefined) ?? {};
}

async function guardarEnCache(url: string, result: AnalysisResult): Promise<void> {
  const cache = await getAnalysisCache();
  cache[url] = { result, analyzedAt: new Date().toISOString() };

  const entradas = Object.entries(cache).sort(
    ([, a], [, b]) => new Date(a.analyzedAt).getTime() - new Date(b.analyzedAt).getTime(),
  );
  while (entradas.length > MAX_CACHE_ENTRIES) {
    const vieja = entradas.shift();
    if (vieja) delete cache[vieja[0]];
  }

  await browser.storage.local.set({ [CACHE_KEY]: cache });
}

async function getUnreadUrls(): Promise<string[]> {
  const result = await browser.storage.local.get(UNREAD_KEY);
  return (result[UNREAD_KEY] as string[] | undefined) ?? [];
}

async function actualizarBadge(unread: string[]): Promise<void> {
  const texto = unread.length === 0 ? '' : String(Math.min(unread.length, 9));
  await browser.action
    ?.setBadgeText({ text: texto })
    .catch((err: unknown) => console.error('No se pudo actualizar el badge:', err));
  if (unread.length > 0) {
    await browser.action
      ?.setBadgeBackgroundColor({ color: BADGE_COLOR })
      .catch((err: unknown) => console.error('No se pudo pintar el badge:', err));
  }
}

async function marcarNoLeido(url: string): Promise<void> {
  const unread = await getUnreadUrls();
  if (unread.includes(url)) return;
  const siguiente = [...unread, url];
  await browser.storage.local.set({ [UNREAD_KEY]: siguiente });
  await actualizarBadge(siguiente);
}

async function marcarLeido(url: string): Promise<void> {
  const unread = await getUnreadUrls();
  const siguiente = unread.filter((u) => u !== url);
  if (siguiente.length === unread.length) return;
  await browser.storage.local.set({ [UNREAD_KEY]: siguiente });
  await actualizarBadge(siguiente);
}

/** El fetch real a POST /analyze — igual al que antes vivía en el panel. */
async function ejecutarAnalisis(url: string): Promise<AnalysisResult> {
  const tokenRes = await handleGetIdToken();
  if ('error' in tokenRes) throw new Error('NEEDS_LOGIN');

  const res = await fetch(`${API_URL}/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenRes.idToken}`,
    },
    body: JSON.stringify({ url }),
  });

  if (res.status === 401) {
    // Sesión inválida/vencida más allá de lo que pudimos refrescar arriba —
    // la limpiamos para que la próxima vez pida login de nuevo.
    await setStoredAuth(null);
    throw new Error('NEEDS_LOGIN');
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error((data as { error?: string } | null)?.error ?? `Error ${res.status}`);
  }

  const resultado = mapBackendResult(data as BackendAnalyzeResponse);
  await guardarEnCache(url, resultado);
  await marcarNoLeido(url);

  // Avisamos a quien esté escuchando (el panel, si sigue abierto sobre esta
  // URL) que ya está listo. Best-effort: si el panel se cerró mientras
  // esperaba, no hay nadie del otro lado y el mensaje se descarta en
  // silencio — por eso el badge de "no leído" es el respaldo.
  browser.runtime
    .sendMessage({ type: 'ANALYSIS_DONE', url, result: resultado })
    .catch(() => {});

  return resultado;
}

type AnalyzeUrlResponse = { result: AnalysisResult } | { error: string };

async function handleAnalyzeUrl(url: string): Promise<AnalyzeUrlResponse> {
  const cache = await getAnalysisCache();
  const cacheado = cache[url];
  if (cacheado) {
    await marcarLeido(url);
    return { result: cacheado.result };
  }

  let promesa = inFlight.get(url);
  if (!promesa) {
    promesa = ejecutarAnalisis(url);
    inFlight.set(url, promesa);
    promesa.finally(() => inFlight.delete(url));
  }

  try {
    return { result: await promesa };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'ERROR_DESCONOCIDO' };
  }
}

type CacheState =
  | { status: 'done'; result: AnalysisResult }
  | { status: 'loading' }
  | { status: 'none' };

/** Le permite al panel, al reabrirse sobre una pestaña, saber sin pegarle
 * al backend si esa URL ya tiene resultado, está en curso, o es nueva. */
async function handleGetCacheState(url: string): Promise<CacheState> {
  const cache = await getAnalysisCache();
  const cacheado = cache[url];
  if (cacheado) {
    await marcarLeido(url);
    return { status: 'done', result: cacheado.result };
  }
  if (inFlight.has(url)) return { status: 'loading' };
  return { status: 'none' };
}

export default defineBackground(() => {
  browser.runtime.onMessage.addListener((message: ExtensionMessage) => {
    if (message?.type === 'ALETHEIA_AUTH_SYNC') return handleAuthSync(message.payload);
    if (message?.type === 'GET_ID_TOKEN') return handleGetIdToken();
    if (message?.type === 'ANALYZE_URL') return handleAnalyzeUrl(message.url);
    if (message?.type === 'GET_CACHE_STATE') return handleGetCacheState(message.url);
  });

  // El service worker se reinicia seguido en MV3 (cada vez que se
  // reinstancia, este callback se vuelve a ejecutar desde cero) — sin esto
  // el badge quedaría en blanco tras un reinicio aunque siga habiendo
  // análisis sin leer guardados en storage.
  getUnreadUrls().then(actualizarBadge).catch(() => {});

  // El panel queda anclado a la ventana, así que al cambiar de pestaña seguía
  // abierto encima de la página nueva. Lo cerramos acá y no desde el panel
  // porque close() llamado desde el propio panel resuelve sin error pero no
  // cierra nada. A diferencia de open(), close() no necesita un gesto del
  // usuario, y es un no-op si el panel ya estaba cerrado.
  //
  // Esto puede cerrar el panel a mitad de un análisis, pero ya no lo pierde:
  // el fetch corre acá en background (ver "Análisis en background" arriba)
  // y sigue hasta terminar aunque el panel se destruya. Al reabrirlo sobre
  // la misma pestaña, GET_CACHE_STATE le devuelve el resultado (o el estado
  // "loading" si todavía sigue en curso).
  browser.tabs.onActivated.addListener(({ windowId }) => {
    browser.sidePanel
      ?.close({ windowId })
      .catch((err: unknown) => console.error('No se pudo cerrar el side panel:', err));
  });

  // Al clickear el ícono de la extensión, abrir el side panel (queda anclado
  // a la derecha mientras navegás, como la extensión de Claude) en vez de un
  // popup que se cierra apenas perdés el foco. Es una API solo de Chrome —
  // en Firefox el entrypoint de sidepanel se resuelve como sidebar_action,
  // con su propio ícono en el panel de sidebars del navegador.
  browser.sidePanel
    ?.setPanelBehavior({ openPanelOnActionClick: true })
    .catch((err: unknown) => console.error('No se pudo configurar el side panel:', err));
});
