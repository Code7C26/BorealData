import { auth } from '@/lib/firebase'
import type { Confidence, SourceStance, Verdict } from '@/lib/verdict'

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
