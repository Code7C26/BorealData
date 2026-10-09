/**
 * La extensión no tiene login propio: escucha la sesión que ya inició la web
 * (ver apps/lib/extension-bridge.ts + entrypoints/auth-bridge.content.ts) y
 * la guarda acá para que el side panel pueda usarla contra el backend.
 *
 * El análisis (POST /analyze) también corre acá y no en el panel — ver
 * "Análisis en background" más abajo — para que sobreviva al cierre del
 * panel al cambiar de pestaña (ver tabs.onActivated, al final del archivo).
 */

import type {
  AnalysisResult,
  BackendAnalyzeResponse,
  CaptureReading,
  ClientContentKind,
  ContentJob,
  ContentJobStatus,
  ReadResponse,
} from '@/lib/analysis';
import { mapBackendResult } from '@/lib/analysis';
import { recortarYComprimir, traerImagen, type CropRect } from '@/lib/capture';
import { detectarPlataforma } from '@/lib/platform';

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
  | { type: 'GET_CACHE_STATE'; url: string }
  // Camino de contenido (captura / imagen / selección) — ver "Análisis de
  // contenido" al final del archivo.
  | { type: 'GET_CONTENT_JOB' }
  | { type: 'START_CAPTURE' }
  | { type: 'READ_JOB'; crop: CropRect }
  | { type: 'VERIFY_JOB'; text: string }
  | { type: 'CANCEL_JOB' };

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

/**
 * Análisis de contenido (captura, imagen, selección)
 * ---------------------------------------------------
 * El camino de /analyze manda una URL y el servidor va a buscarla. Contra
 * Facebook, Instagram o X eso trae el muro de login, no la nota — y una
 * historia de Instagram no la lee ningún scraper, porque el texto está en
 * píxeles. Así que acá va el otro camino: la evidencia que el usuario YA tiene
 * delante, armada en su propio navegador. Ver DOCS/BRIEF-captura-contenido-privado.md.
 *
 * Son dos pasos de backend, y el de en medio es del usuario:
 *   1. POST /analyze/read     — el modelo transcribe la imagen. Sin veredicto.
 *   2. (el usuario revisa y corrige la transcripción en el panel)
 *   3. POST /analyze/content  — se verifica ESE texto, no la imagen.
 *
 * El estado de ese ida y vuelta vive acá, en `job`, y no en el panel, por lo
 * mismo que el análisis de URL (ver "Análisis en background"): el panel se
 * destruye al cambiar de pestaña y se perdería el trabajo a mitad de camino.
 * Al reabrirse, GET_CONTENT_JOB le devuelve el job tal como está y retoma la
 * pantalla que corresponda.
 *
 * Privacidad (reglas duras del brief, sección 6):
 * - La imagen NO se persiste: vive en `job.captureDataUrl`, en memoria del
 *   service worker, y se borra en cuanto el paso 1 la leyó. No pasa por
 *   storage.local, así que no toca el disco ni sobrevive a un reinicio.
 * - El resultado NO entra al caché por URL (`aletheia_analysis_cache`): la
 *   misma pageUrl (instagram.com) es un posteo distinto cada vez, y el
 *   análisis de un posteo privado no puede servírsele a nadie más.
 * - Nunca se captura solo: siempre media un clic (el botón del panel o el
 *   menú contextual).
 */

/**
 * Un job a la vez, en memoria. Si el service worker se reinicia a mitad de un
 * flujo, el job se pierde y el panel vuelve a la pantalla inicial — preferible
 * a dejar una captura escrita en disco. Chrome mantiene vivo el worker
 * mientras haya un fetch en curso iniciado por él, así que los dos pasos de
 * red no se cortan por inactividad.
 */
let job: ContentJob | null = null;

/** Le avisa al panel (si está abierto) que el job cambió. Best-effort. */
function emitirJob(): void {
  browser.runtime.sendMessage({ type: 'CONTENT_JOB', job }).catch(() => {});
}

function actualizarJob(cambios: Partial<ContentJob>): ContentJob | null {
  if (!job) return null;
  job = { ...job, ...cambios };
  emitirJob();
  return job;
}

function fallarJob(error: string, errorCode?: string): void {
  actualizarJob({ status: 'error', error, errorCode, captureDataUrl: undefined });
}

/** Etiqueta corta del origen. Duplica lib/platform.ts a propósito: el worker no comparte su contexto. */
function etiquetaOrigen(url: string | null): string {
  if (!url) return 'esta pantalla';
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.startsWith('www.') ? host.slice(4) : host;
  } catch {
    return 'esta pantalla';
  }
}

function nuevoJob(
  kind: ClientContentKind,
  pageUrl: string | null,
  status: ContentJobStatus,
): ContentJob {
  job = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    kind,
    status,
    pageUrl,
    platform: detectarPlataforma(pageUrl),
    originLabel: etiquetaOrigen(pageUrl),
  };
  return job;
}

async function tabActiva(): Promise<{ id?: number; url?: string; windowId?: number } | undefined> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  return tab;
}

/**
 * La captura de pantalla. Requiere permiso de host sobre esa pestaña: para los
 * dominios sociales ya está declarado en wxt.config.ts, y para el resto lo pide
 * el panel con el clic del usuario (asegurarPermisoDeCaptura) antes de llamar
 * acá. El clic en el menú contextual lo garantiza por sí solo, vía activeTab.
 */
async function capturarPantalla(windowId?: number): Promise<string> {
  // JPEG 95 y no PNG: la captura viaja como data URL por sendMessage hasta el
  // panel, y un PNG de pantalla completa son varios MB de string. A 95 la
  // pérdida es invisible para el OCR, y de todas formas el recorte se
  // re-comprime a 0.8 antes de salir a la red.
  const opciones = { format: 'jpeg' as const, quality: 95 };
  // Sin windowId captura la ventana actual; los tipos de la API no aceptan
  // `undefined` en ese parametro, asi que se eligen las dos firmas a mano.
  return windowId === undefined
    ? browser.tabs.captureVisibleTab(opciones)
    : browser.tabs.captureVisibleTab(windowId, opciones);
}

/** POST /analyze/read — paso 1. Devuelve la transcripción, sin veredicto. */
async function leerImagenes(
  imagenes: { mimeType: string; dataBase64: string }[],
): Promise<CaptureReading> {
  const tokenRes = await handleGetIdToken();
  if ('error' in tokenRes) throw new Error('NEEDS_LOGIN');

  const res = await fetch(`${API_URL}/analyze/read`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenRes.idToken}`,
    },
    body: JSON.stringify({ images: imagenes }),
  });

  if (res.status === 401) {
    await setStoredAuth(null);
    throw new Error('NEEDS_LOGIN');
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error((data as { error?: string } | null)?.error ?? 'No pudimos leer la imagen.');
  }
  return (data as ReadResponse).reading;
}

/**
 * POST /analyze/content — paso 2. Verifica el TEXTO (la transcripción ya
 * corregida por el usuario), no la imagen: a esta altura la imagen ya se borró.
 */
async function verificarContenido(actual: ContentJob, text: string): Promise<AnalysisResult> {
  const tokenRes = await handleGetIdToken();
  if ('error' in tokenRes) throw new Error('NEEDS_LOGIN');

  const res = await fetch(`${API_URL}/analyze/content`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenRes.idToken}`,
    },
    body: JSON.stringify({
      source: {
        kind: actual.kind,
        // El modelo lector gana sobre la pista del dominio: leyó la imagen.
        platform: actual.reading?.platform ?? actual.platform,
        pageUrl: actual.pageUrl,
        capturedAt: new Date().toISOString(),
      },
      content: {
        text,
        author: actual.reading?.author ?? undefined,
      },
    }),
  });

  if (res.status === 401) {
    await setStoredAuth(null);
    throw new Error('NEEDS_LOGIN');
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error((data as { error?: string } | null)?.error ?? `Error ${res.status}`);
  }

  // El resultado NO se guarda en el caché por URL: ver "Privacidad" arriba.
  return mapBackendResult(data as BackendAnalyzeResponse);
}

/** El botón "Analizar lo que estás viendo" del panel. */
async function handleStartCapture(): Promise<{ ok: true } | { error: string }> {
  const tab = await tabActiva();
  const url = tab?.url?.startsWith('http') ? tab.url : null;

  try {
    const dataUrl = await capturarPantalla(tab?.windowId);
    const creado = nuevoJob('capture', url, 'cropping');
    creado.captureDataUrl = dataUrl;
    emitirJob();
    return { ok: true };
  } catch (err) {
    // Lo más común acá: una página que el navegador no deja capturar
    // (chrome://, la tienda de extensiones) o falta de permiso de host.
    const sinPermiso =
      err instanceof Error && /permission|activeTab|cannot be scripted/i.test(err.message);
    return {
      error: sinPermiso
        ? 'No tenemos permiso para capturar esta página. Probá con el clic derecho sobre la página.'
        : 'No pudimos capturar esta pantalla. Hay páginas que el navegador no deja capturar (chrome://, la tienda de extensiones).',
    };
  }
}

/** Paso 1 sobre la captura ya recortada por el usuario. */
async function handleReadJob(crop: CropRect): Promise<void> {
  const actual = job;
  if (!actual?.captureDataUrl) return;

  actualizarJob({ status: 'reading' });
  try {
    const preparada = await recortarYComprimir(actual.captureDataUrl, crop);
    const reading = await leerImagenes([preparada.image]);
    // La imagen cumplió su función: se borra antes de seguir (regla dura).
    actualizarJob({ status: 'review', reading, captureDataUrl: undefined });
  } catch (err) {
    if (err instanceof Error && err.message === 'NEEDS_LOGIN') {
      fallarJob('Tenés que volver a iniciar sesión.', 'NEEDS_LOGIN');
      return;
    }
    fallarJob(err instanceof Error ? err.message : 'No pudimos leer la imagen.');
  }
}

/** Lo mismo, pero sobre una imagen de la página (menú contextual sobre una imagen). */
async function leerImagenDeUrl(srcUrl: string): Promise<void> {
  if (!job) return;
  try {
    const blob = await traerImagen(srcUrl);
    const preparada = await recortarYComprimir(blob);
    const reading = await leerImagenes([preparada.image]);
    actualizarJob({ status: 'review', reading });
  } catch (err) {
    if (err instanceof Error && err.message === 'NEEDS_LOGIN') {
      fallarJob('Tenés que volver a iniciar sesión.', 'NEEDS_LOGIN');
      return;
    }
    fallarJob(err instanceof Error ? err.message : 'No pudimos leer la imagen.');
  }
}

/** Paso 2: el usuario confirmó (o corrigió) la transcripción. */
async function handleVerifyJob(text: string): Promise<void> {
  const actual = job;
  if (!actual) return;

  actualizarJob({ status: 'analyzing', verifiedText: text });
  try {
    const result = await verificarContenido(actual, text);
    actualizarJob({ status: 'done', result });
  } catch (err) {
    if (err instanceof Error && err.message === 'NEEDS_LOGIN') {
      fallarJob('Tenés que volver a iniciar sesión.', 'NEEDS_LOGIN');
      return;
    }
    fallarJob(err instanceof Error ? err.message : 'No pudimos completar el análisis.');
  }
}

function handleCancelJob(): { ok: true } {
  job = null;
  emitirJob();
  return { ok: true };
}

// Menú contextual
// ---------------
// La vía más precisa de las puertas de entrada: el usuario señala exactamente
// qué quiere verificar. Y un clic acá garantiza activeTab sobre esa pestaña,
// que es lo que necesita captureVisibleTab.

const MENU = {
  captura: 'aletheia-capturar-pagina',
  seleccion: 'aletheia-analizar-seleccion',
  imagen: 'aletheia-analizar-imagen',
} as const;

function crearMenuContextual(): void {
  // removeAll primero: `create` con un id que ya existe tira error, y esto se
  // vuelve a ejecutar cada vez que se reinstancia el service worker.
  //
  // Va por promesa y no por callback a propósito: en Chrome las dos formas
  // andan, pero la API estilo `browser.*` (Firefox) devuelve una promesa e
  // IGNORA el callback, así que con la forma de callback los ítems no se
  // crearían nunca en ese navegador.
  Promise.resolve(browser.contextMenus.removeAll())
    .then(() => {
      browser.contextMenus.create({
        id: MENU.seleccion,
        title: 'Analizar esta selección con AletheIA',
        contexts: ['selection'],
      });
      browser.contextMenus.create({
        id: MENU.imagen,
        title: 'Analizar esta imagen con AletheIA',
        contexts: ['image'],
      });
      browser.contextMenus.create({
        id: MENU.captura,
        title: 'Analizar lo que estoy viendo con AletheIA',
        contexts: ['page'],
      });
    })
    .catch((err: unknown) => console.error('No se pudo armar el menú contextual:', err));
}

/**
 * Hay que abrir el panel ANTES de capturar, no después: sidePanel.open() exige
 * un gesto del usuario y cualquier await previo lo pierde. Como abrir el panel
 * angosta la página, se espera un instante a que el navegador reacomode el
 * layout — si no, la captura sale con el ancho viejo y no coincide con lo que
 * el usuario tiene delante cuando recorta.
 */
const ESPERA_RELAYOUT_MS = 350;

async function handleMenuClick(
  info: {
    menuItemId: string | number;
    selectionText?: string;
    srcUrl?: string;
    pageUrl?: string;
  },
  tab?: { id?: number; url?: string; windowId?: number },
): Promise<void> {
  const windowId = tab?.windowId;
  if (windowId !== undefined) {
    await browser.sidePanel?.open({ windowId }).catch((err: unknown) => {
      console.error('No se pudo abrir el side panel desde el menú contextual:', err);
    });
  }

  const pageUrl = info.pageUrl ?? tab?.url ?? null;

  if (info.menuItemId === MENU.seleccion) {
    // Una selección ya es texto: no hay nada que transcribir, así que se
    // saltea el paso 1 y va derecho a verificar (sección 4.2 del brief).
    nuevoJob('selection', pageUrl, 'analyzing');
    emitirJob();
    await handleVerifyJob((info.selectionText ?? '').trim());
    return;
  }

  if (info.menuItemId === MENU.imagen && info.srcUrl) {
    nuevoJob('image', pageUrl, 'reading');
    emitirJob();
    await leerImagenDeUrl(info.srcUrl);
    return;
  }

  if (info.menuItemId === MENU.captura) {
    // El job recién nace con la captura ya en la mano: anunciarlo antes
    // obligaría a mostrar una pantalla de espera que miente sobre lo que está
    // pasando ("leyendo la imagen" cuando todavía no hay imagen).
    await new Promise((resolve) => setTimeout(resolve, ESPERA_RELAYOUT_MS));
    try {
      const dataUrl = await capturarPantalla(windowId);
      const creado = nuevoJob('capture', pageUrl, 'cropping');
      creado.captureDataUrl = dataUrl;
      emitirJob();
    } catch {
      nuevoJob('capture', pageUrl, 'error');
      fallarJob('No pudimos capturar esta pantalla.');
    }
  }
}

export default defineBackground(() => {
  browser.runtime.onMessage.addListener((message: ExtensionMessage) => {
    if (message?.type === 'ALETHEIA_AUTH_SYNC') return handleAuthSync(message.payload);
    if (message?.type === 'GET_ID_TOKEN') return handleGetIdToken();
    if (message?.type === 'ANALYZE_URL') return handleAnalyzeUrl(message.url);
    if (message?.type === 'GET_CACHE_STATE') return handleGetCacheState(message.url);
    // Camino de contenido. READ_JOB y VERIFY_JOB no devuelven el resultado por
    // este canal: el panel se entera por el mensaje CONTENT_JOB que emiten en
    // cada transición, que es lo único que sigue funcionando si el panel se
    // cerró y se volvió a abrir a mitad del flujo.
    if (message?.type === 'GET_CONTENT_JOB') return Promise.resolve(job);
    if (message?.type === 'START_CAPTURE') return handleStartCapture();
    // El chequeo de estado evita que un doble clic dispare dos veces el mismo
    // paso: cada uno es una llamada real (y paga) al modelo. Va acá y no
    // adentro de los handlers porque el camino de selección llama a
    // handleVerifyJob por su cuenta, con el job ya en 'analyzing'.
    if (message?.type === 'READ_JOB') {
      if (job?.status === 'cropping') handleReadJob(message.crop);
      return Promise.resolve({ ok: true });
    }
    if (message?.type === 'VERIFY_JOB') {
      if (job?.status === 'review') handleVerifyJob(message.text);
      return Promise.resolve({ ok: true });
    }
    if (message?.type === 'CANCEL_JOB') return Promise.resolve(handleCancelJob());
  });

  crearMenuContextual();
  browser.runtime.onInstalled.addListener(crearMenuContextual);
  browser.contextMenus.onClicked.addListener(handleMenuClick);

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
    // Ojo: esto NO cancela un job de contenido en curso. El fetch vive acá y
    // sigue; al reabrir el panel, GET_CONTENT_JOB lo retoma donde quedó. Lo
    // único que se pierde si el usuario se va es la pantalla, no el trabajo.
    browser.sidePanel
      ?.close({ windowId })
      .catch((err: unknown) => console.error('No se pudo cerrar el side panel:', err));
  });

  // Al clickear el ícono de la extensión, abrir el side panel (queda anclado
  // a la derecha mientras navegás, como la extensión de Claude) en vez de un
  // popup que se cierra apenas perdés el foco. Es una API solo de Chrome —
  // en Firefox el entrypoint de sidepanel se resuelve como sidebar_action,
  // con su propio ícono en el panel de sidebars del navegador.
  //
  // OJO con `openPanelOnActionClick`: con `true`, Chrome abre el panel por su
  // cuenta y la extensión NUNCA se entera del clic, asi que no recibe
  // activeTab sobre esa pestana. Sin activeTab y sin host permission declarado
  // (o sea, todo lo que no sea un dominio social de wxt.config.ts),
  // `tabs.query()` devuelve la pestana SIN `url`, y de ahi en cascada: el panel
  // no puede calcular el patron del permiso, nunca llega a pedirlo, y
  // captureVisibleTab falla por falta de permiso.
  //
  // Era exactamente el bug de "la primera vez en una pagina el boton no anda,
  // pero despues del clic derecho si": el menu contextual SI otorga activeTab,
  // y queda otorgado para esa pestana hasta que navegue.
  //
  // Con `false` + este listener, el clic en el icono pasa por la extension y
  // otorga activeTab igual que el menu contextual. `sidePanel.open()` exige un
  // gesto del usuario y el handler de `action.onClicked` lo es — por eso se
  // abre sin ningun await previo, que lo consumiria.
  browser.sidePanel
    ?.setPanelBehavior({ openPanelOnActionClick: false })
    .catch((err: unknown) => console.error('No se pudo configurar el side panel:', err));

  browser.action?.onClicked.addListener((tab: { windowId?: number }) => {
    if (tab.windowId === undefined) return;
    browser.sidePanel
      ?.open({ windowId: tab.windowId })
      .catch((err: unknown) => console.error('No se pudo abrir el side panel:', err));
  });
});
