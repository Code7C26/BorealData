import { auth } from '@/lib/firebase'
import type { Confidence, SourceStance, Verdict } from '@/lib/verdict'
import type { Idioma } from '@/lib/idioma'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

export type { Confidence, SourceStance, Verdict }

/** Mismo shape que backend/src/gemini/types.ts (AnalysisSource). */
export interface AnalysisSource {
  /** Dominio sin protocolo ni www — es lo que se muestra en la fila. */
  domain: string
  title: string
  url: string | null
  stance: SourceStance
  note: string
}

/**
 * Respuesta 200 de POST /analyze (backend/src/routes/analyze.ts).
 *
 * Rediseño V1 (sep-2026): salieron `score` (0-100), `label` (6 valores),
 * `explanation` y `claimVsEvidence`. Entraron `verdict` (4 valores),
 * `confidence` (1-5), `headline` en lenguaje natural, `lead` y los pasos de
 * `reasoning`. El backend traduce solo las filas viejas al leerlas, así que
 * acá ya no hay nada del esquema anterior.
 */
export interface AnalyzeResponse {
  /**
   * Id de la fila guardada. Es lo que arma el link público de /resultado/:id
   * detrás de "Compartir verificación". Falta cuando el análisis no llegó a
   * guardarse (DB caída) o cuando se está mirando el ejemplo precargado: ahí el
   * botón comparte la URL actual en vez de un link que no existe.
   */
  id?: string | null
  url: string
  title: string
  scrapeMethod: string
  verdict: Verdict
  confidence: Confidence
  /** Frase en lenguaje natural. NUNCA la etiqueta del veredicto. */
  headline: string
  /** 1 a 2 oraciones que sostienen el titular con el dato concreto. */
  lead: string
  /** De qué trata la nota, no el veredicto. */
  summary: string
  /** Los pasos del razonamiento, en orden. La numeración la dibuja la card. */
  reasoning: string[]
  sources: AnalysisSource[]
  toneFlags: string[]
  /**
   * false cuando el análisis NO tiene página pública en /resultado/:id, aunque
   * tenga `id`. Lo manda POST /analyze/content: el análisis de una imagen que
   * subió una persona no se le sirve a otra (ver getAnalysisById en el
   * backend), así que ofrecer "Compartir verificación" ahí daría un link roto.
   */
  shareable?: boolean
  /**
   * Idioma en que escribió Gemini. Falta en el ejemplo precargado y en resultados viejos
   * guardados en sessionStorage; el backend lo manda siempre ('es' para todo lo anterior
   * a oct-2026).
   */
  language?: Idioma
}

/** Item de GET /history (backend/src/db/analysesRepository.ts::AnalysisHistoryItem). */
export interface HistoryItem extends Omit<AnalyzeResponse, 'title' | 'scrapeMethod' | 'summary'> {
  id: string
  title: string | null
  scrapeMethod: string | null
  summary: string | null
  createdAt: string
}

export interface HistoryResponse {
  analyses: HistoryItem[]
  limit: number
  offset: number
}

/**
 * Respuesta de GET /stats (backend/src/db/analysesRepository.ts::GlobalStats).
 * Totales de toda la plataforma acumulados desde siempre — no son del día ni del
 * usuario logueado.
 */
export interface GlobalStats {
  totalAnalyses: number
  totalSources: number
  /** Promedio del nivel de confianza, 1 a 5 con un decimal. */
  averageConfidence: number
  verdicts: Record<Verdict, number>
}

/** Respuesta de GET /me (backend/src/db/usersRepository.ts::UserProfile). */
export interface UserProfile {
  id: string
  firebaseUid: string
  email: string | null
  fullName: string | null
  createdAt: string
}

export class ApiError extends Error {
  status: number
  body: unknown

  constructor(status: number, message: string, body: unknown) {
    super(message)
    this.status = status
    this.body = body
  }
}

/**
 * Fetch autenticado contra el backend: agrega el ID token de Firebase del
 * usuario actual (se refresca solo si está por vencer, ver docs de
 * `getIdToken` del SDK) y arma la URL completa con NEXT_PUBLIC_API_URL.
 */
export async function apiFetch<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const idToken = await auth.currentUser?.getIdToken()

  const res = await fetch(`${API_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  })

  let data: unknown = null
  try {
    data = await res.json()
  } catch {
    // respuesta sin body (poco común, pero no debería romper el caller)
  }

  if (!res.ok) {
    const message =
      (data as { error?: string } | null)?.error ?? `Error ${res.status} llamando a ${path}`
    throw new ApiError(res.status, message, data)
  }

  return data as T
}

// ── Contenido que el scraper no puede ver ───────────────────────────────
// Espejo de la sección homónima de backend/src/gemini/types.ts. Una captura de
// un posteo privado no tiene URL que el servidor pueda ir a buscar: lo que se
// manda es la evidencia que la persona ya tiene. Ver
// DOCS/BRIEF-captura-contenido-privado.md.

/** Plataformas que el backend reconoce (KNOWN_PLATFORMS). */
export type Platform = 'facebook' | 'instagram' | 'x' | 'whatsapp' | 'tiktok' | 'otro'

/** De dónde salió el contenido. Nunca "url": eso va por POST /analyze. */
export type ClientContentKind = 'capture' | 'selection' | 'image' | 'text'

/** Qué tan legible quedó la imagen, según el propio modelo lector. */
export type ReadingConfidence = 'alta' | 'media' | 'baja'

/**
 * Paso 1 (POST /analyze/read): lo que el modelo LEYÓ de la imagen, sin
 * veredicto. `text` es la transcripción tal cual — la persona la corrige antes
 * del paso 2, que es lo que más sube la calidad del veredicto.
 */
export interface CaptureReading {
  platform: Platform | null
  author: string | null
  /** Fecha tal como aparece en el posteo: texto libre ("hace 3 h"). */
  postedAt: string | null
  text: string
  /** La afirmación central verificable, o null si no hay ninguna. */
  mainClaim: string | null
  /** Fuente que el propio posteo cita ("según la OMS…"), si cita alguna. */
  citedSource: string | null
  /** false si es un meme o una frase sin dato comprobable. */
  hasVerifiableClaim: boolean
  readingConfidence: ReadingConfidence
}

/**
 * Límites de texto de POST /analyze/content (MIN_TEXT_CHARS / MAX_TEXT_CHARS).
 * Se repiten acá para avisar antes de gastar el viaje de red.
 */
export const MIN_CONTENT_CHARS = 8
export const MAX_CONTENT_CHARS = 12_000

/**
 * Paso 1: transcribe la imagen. No devuelve veredicto a propósito — el
 * veredicto sale del paso 2, sobre el texto que la persona confirmó.
 *
 * `idioma` solo cambia `mainClaim` (lo único que el modelo escribe con palabras
 * propias): la transcripción queda siempre en el idioma del posteo.
 */
export async function leerImagen(imagenes: { mimeType: string; dataBase64: string }[], idioma: Idioma) {
  const { reading } = await apiFetch<{ reading: CaptureReading }>('/analyze/read', {
    method: 'POST',
    body: { images: imagenes, language: idioma },
  })
  return reading
}

/**
 * Analiza una URL. `idioma` es el de la interfaz: Gemini escribe el análisis en ese
 * idioma, y la caché del backend matchea por (url, idioma), así que nunca devuelve un
 * análisis en castellano a quien usa la web en inglés.
 */
export async function analizarUrl(url: string, idioma: Idioma) {
  return apiFetch<AnalyzeResponse>('/analyze', {
    method: 'POST',
    body: { url, language: idioma },
  })
}

/** Paso 2: verifica el texto ya confirmado. Devuelve lo mismo que POST /analyze. */
export async function analizarContenido(entrada: {
  kind: ClientContentKind
  text: string
  platform?: Platform | null
  author?: string | null
  pageUrl?: string | null
  idioma: Idioma
}) {
  return apiFetch<AnalyzeResponse>('/analyze/content', {
    method: 'POST',
    body: {
      language: entrada.idioma,
      source: {
        kind: entrada.kind,
        platform: entrada.platform ?? null,
        pageUrl: entrada.pageUrl ?? null,
        capturedAt: new Date().toISOString(),
      },
      content: {
        text: entrada.text,
        author: entrada.author ?? undefined,
      },
    },
  })
}
