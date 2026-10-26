import { API_URL } from '@/lib/config';
import { auth } from '@/lib/firebase';
import type { Confidence, SourceStance, Verdict } from '@/lib/verdict';

/**
 * Cliente del backend — espejo de `apps/lib/api.ts`.
 *
 * Los tipos son los mismos (misma API, mismo contrato), y las diferencias son
 * dos: la URL base sale de `config.ts` (que en desarrollo la deduce del host de
 * Metro, porque en el teléfono `localhost` es el teléfono) y hay un timeout
 * explícito: en celular una red que se cae deja el fetch colgado para siempre y
 * la pantalla de "analizando" nunca termina.
 */

export type { Confidence, SourceStance, Verdict };

/** Idioma en que Gemini escribe el análisis. El backend cachea por (url, idioma). */
export type Idioma = 'es' | 'en';

/** Mismo shape que `backend/src/gemini/types.ts` (AnalysisSource). */
export interface AnalysisSource {
  /** Dominio sin protocolo ni www — es lo que se muestra en la fila. */
  domain: string;
  title: string;
  url: string | null;
  stance: SourceStance;
  note: string;
}

/** Respuesta 200 de POST /analyze (`backend/src/routes/analyze.ts`). */
export interface AnalyzeResponse {
  /**
   * Id de la fila guardada: es lo que arma el link público `/resultado/:id`
   * detrás de "Compartir". Falta cuando el análisis no llegó a guardarse.
   */
  id?: string | null;
  url: string;
  title: string;
  scrapeMethod: string;
  verdict: Verdict;
  confidence: Confidence;
  /** Frase en lenguaje natural. NUNCA la etiqueta del veredicto. */
  headline: string;
  /** 1 a 2 oraciones que sostienen el titular con el dato concreto. */
  lead: string;
  /** De qué trata la nota, no el veredicto. */
  summary: string;
  /** Los pasos del razonamiento, en orden. La numeración la dibuja la card. */
  reasoning: string[];
  sources: AnalysisSource[];
  toneFlags: string[];
  /**
   * false cuando el análisis no tiene página pública aunque tenga `id`: el
   * análisis de una captura que subió una persona no se le sirve a otra, así que
   * ofrecer "Compartir" ahí daría un link roto.
   */
  shareable?: boolean;
  language?: Idioma;
}

/** Item de GET /history (`AnalysisHistoryItem` en el backend). */
export interface HistoryItem extends Omit<AnalyzeResponse, 'title' | 'scrapeMethod' | 'summary'> {
  id: string;
  title: string | null;
  scrapeMethod: string | null;
  summary: string | null;
  createdAt: string;
}

export interface HistoryResponse {
  analyses: HistoryItem[];
  limit: number;
  offset: number;
}

/** GET /stats — totales de toda la plataforma, no del usuario logueado. */
export interface GlobalStats {
  totalAnalyses: number;
  totalSources: number;
  /** Promedio del nivel de confianza, 1 a 5 con un decimal. */
  averageConfidence: number;
  verdicts: Record<Verdict, number>;
}

/** GET /me (`UserProfile` en el backend). */
export interface UserProfile {
  id: string;
  firebaseUid: string;
  email: string | null;
  fullName: string | null;
  createdAt: string;
}

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

/** Se distingue del ApiError porque no hubo respuesta: no hay status que mostrar. */
export class RedError extends Error {
  constructor(message = 'No se pudo conectar con el servidor.') {
    super(message);
  }
}

/** Un análisis puede tardar bastante (scraping + Gemini + grounding). */
const TIMEOUT_MS = { corto: 15_000, analisis: 120_000 } as const;

/**
 * Fetch autenticado: agrega el ID token de Firebase del usuario actual (el SDK
 * lo refresca solo si está por vencer) y arma la URL contra `API_URL`.
 */
export async function apiFetch<T>(
  path: string,
  options: { method?: string; body?: unknown; timeoutMs?: number } = {},
): Promise<T> {
  const idToken = await auth.currentUser?.getIdToken();

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      // AbortSignal.timeout corta el fetch solo; sin esto, una red caída deja la
      // promesa pendiente y la pantalla de "analizando" gira para siempre.
      signal: AbortSignal.timeout(options.timeoutMs ?? TIMEOUT_MS.corto),
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'TimeoutError') {
      throw new RedError('El servidor tardó demasiado en responder.');
    }
    throw new RedError(
      `No se pudo conectar con el servidor (${API_URL}). Revisá que el backend esté corriendo y que el teléfono esté en la misma red.`,
    );
  }

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    // respuesta sin body: no debería romper al caller
  }

  if (!res.ok) {
    const message =
      (data as { error?: string } | null)?.error ?? `Error ${res.status} llamando a ${path}`;
    throw new ApiError(res.status, message, data);
  }

  return data as T;
}

// ── Análisis ────────────────────────────────────────────────────────────────

/** Analiza un enlace. El backend scrapea, verifica y guarda. */
export async function analizarUrl(url: string, idioma: Idioma = 'es') {
  return apiFetch<AnalyzeResponse>('/analyze', {
    method: 'POST',
    body: { url, language: idioma },
    timeoutMs: TIMEOUT_MS.analisis,
  });
}

// ── Contenido que el scraper no puede ver ───────────────────────────────────
// Espejo de la sección homónima de `backend/src/gemini/types.ts`. Una captura de
// un posteo privado no tiene URL que el servidor pueda ir a buscar: lo que se
// manda es la evidencia que la persona ya tiene. Ver
// DOCS/BRIEF-captura-contenido-privado.md.

/** Plataformas que el backend reconoce (KNOWN_PLATFORMS). */
export type Platform = 'facebook' | 'instagram' | 'x' | 'whatsapp' | 'tiktok' | 'otro';

/** De dónde salió el contenido. Nunca "url": eso va por POST /analyze. */
export type ClientContentKind = 'capture' | 'selection' | 'image' | 'text';

/** Qué tan legible quedó la imagen, según el propio modelo lector. */
export type ReadingConfidence = 'alta' | 'media' | 'baja';

/**
 * Paso 1 (POST /analyze/read): lo que el modelo LEYÓ de la imagen, sin
 * veredicto. `text` es la transcripción tal cual — la persona la corrige antes
 * del paso 2, que es lo que más sube la calidad del veredicto.
 */
export interface CaptureReading {
  platform: Platform | null;
  author: string | null;
  /** Fecha tal como aparece en el posteo: texto libre ("hace 3 h"). */
  postedAt: string | null;
  text: string;
  /** La afirmación central verificable, o null si no hay ninguna. */
  mainClaim: string | null;
  /** Fuente que el propio posteo cita ("según la OMS…"), si cita alguna. */
  citedSource: string | null;
  /** false si es un meme o una frase sin dato comprobable. */
  hasVerifiableClaim: boolean;
  readingConfidence: ReadingConfidence;
}

/** Límites de POST /analyze/content. Se repiten para avisar antes del viaje de red. */
export const MIN_CONTENT_CHARS = 8;
export const MAX_CONTENT_CHARS = 12_000;

/**
 * Paso 1: transcribe la captura. No devuelve veredicto a propósito — el
 * veredicto sale del paso 2, sobre el texto que la persona confirmó.
 */
export async function leerImagen(
  imagenes: { mimeType: string; dataBase64: string }[],
  idioma: Idioma = 'es',
) {
  const { reading } = await apiFetch<{ reading: CaptureReading }>('/analyze/read', {
    method: 'POST',
    body: { images: imagenes, language: idioma },
    timeoutMs: TIMEOUT_MS.analisis,
  });
  return reading;
}

/** Paso 2: verifica el texto ya confirmado. Devuelve lo mismo que POST /analyze. */
export async function analizarContenido(entrada: {
  kind: ClientContentKind;
  text: string;
  platform?: Platform | null;
  author?: string | null;
  pageUrl?: string | null;
  idioma?: Idioma;
}) {
  return apiFetch<AnalyzeResponse>('/analyze/content', {
    method: 'POST',
    body: {
      language: entrada.idioma ?? 'es',
      source: {
        kind: entrada.kind,
        platform: entrada.platform ?? null,
        pageUrl: entrada.pageUrl ?? null,
        capturedAt: new Date().toISOString(),
      },
      content: { text: entrada.text, author: entrada.author ?? undefined },
    },
    timeoutMs: TIMEOUT_MS.analisis,
  });
}

// ── Historial, perfil y borrado ─────────────────────────────────────────────

export async function getHistorial(params: { limit?: number; offset?: number } = {}) {
  const query = new URLSearchParams();
  if (params.limit !== undefined) query.set('limit', String(params.limit));
  if (params.offset !== undefined) query.set('offset', String(params.offset));
  const sufijo = query.toString() ? '?' + query.toString() : '';
  return apiFetch<HistoryResponse>(`/history${sufijo}`);
}

/**
 * GET /analyses/:id tiene auth OPCIONAL: sin sesión sirve el análisis de un
 * enlace público, con sesión sirve además los propios que salieron de una
 * captura (que solo ve su dueño).
 */
export async function getAnalisis(id: string) {
  return apiFetch<AnalyzeResponse & { createdAt?: string }>(`/analyses/${id}`);
}

export async function getStats() {
  return apiFetch<GlobalStats>('/stats');
}

export async function getPerfil() {
  return apiFetch<UserProfile>('/me');
}

export async function guardarNombre(fullName: string) {
  return apiFetch<{ id: string; fullName: string }>('/me', {
    method: 'POST',
    body: { fullName },
  });
}

export async function borrarAnalisis(id: string) {
  return apiFetch<{ deleted: boolean }>(`/analyses/${id}`, { method: 'DELETE' });
}

export async function borrarHistorial() {
  return apiFetch<{ deleted: number }>('/history', { method: 'DELETE' });
}

/** Borra la cuenta y todos sus análisis, en una transacción. */
export async function borrarCuenta() {
  return apiFetch<{ deleted: boolean }>('/me', { method: 'DELETE' });
}
