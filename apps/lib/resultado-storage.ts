import type { AnalyzeResponse, HistoryItem } from '@/lib/api'

const STORAGE_KEY = 'aletheia_last_result'
/** El input jamás se pierde ante un error: sobrevive acá y se repone al volver. */
const DRAFT_KEY = 'aletheia_draft'

export type ResultadoStatus = 'ok' | 'insuficiente' | 'error'

/**
 * Resultado de un análisis (recién hecho en /analizando, o uno histórico
 * reabierto desde /historial), pasado a /resultado vía sessionStorage —
 * evita tener que volver a pegarle a /analyze (que gasta una llamada real a
 * Gemini) solo para renderizar la misma pantalla.
 */
export interface ResultadoGuardado {
  status: ResultadoStatus
  tipo: string
  valor: string
  data?: AnalyzeResponse
  /** ISO string — momento del análisis (ahora mismo, o `createdAt` si viene del historial). */
  fecha?: string
  mensaje?: string
  /** Código técnico para soporte, va en micro al pie de la card de error. */
  codigo?: string
}

export function guardarResultado(resultado: ResultadoGuardado) {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(resultado))
  } catch {
    // Storage bloqueado o lleno: se pierde el pase a /resultado, no la sesión.
  }
}

export function leerResultado(): ResultadoGuardado | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as ResultadoGuardado
  } catch {
    return null
  }
}

/**
 * Lo que el usuario pegó, guardado aparte del resultado. Regla del sistema: el
 * input nunca se vacía ante un error — "guardamos lo que pegaste" tiene que ser
 * verdad, incluso si se cortó la conexión o recargó la página.
 */
export function guardarBorrador(valor: string) {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(DRAFT_KEY, valor)
  } catch {
    // idem
  }
}

export function leerBorrador(): string {
  if (typeof window === 'undefined') return ''
  try {
    return window.sessionStorage.getItem(DRAFT_KEY) ?? ''
  } catch {
    return ''
  }
}

export function limpiarBorrador() {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.removeItem(DRAFT_KEY)
  } catch {
    // idem
  }
}

/**
 * Un item de /history con la forma que espera la card de resultado. Los campos
 * que en el historial pueden ser null (título, resumen) acá ya vienen resueltos.
 */
export function historyItemToAnalyzeResponse(item: HistoryItem): AnalyzeResponse {
  return {
    id: item.id,
    url: item.url,
    title: item.title ?? item.url,
    scrapeMethod: item.scrapeMethod ?? '',
    verdict: item.verdict,
    confidence: item.confidence,
    headline: item.headline,
    lead: item.lead,
    summary: item.summary ?? '',
    reasoning: item.reasoning,
    sources: item.sources,
    toneFlags: item.toneFlags,
  }
}

/** Reabre un análisis ya guardado (de /historial o del sidebar) en /resultado, sin re-consultar el backend. */
export function guardarResultadoDesdeHistorial(item: HistoryItem) {
  guardarResultado({
    status: 'ok',
    tipo: 'url',
    valor: item.url,
    fecha: item.createdAt,
    data: historyItemToAnalyzeResponse(item),
  })
}
