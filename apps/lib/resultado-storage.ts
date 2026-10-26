import type { AnalyzeResponse, ClientContentKind, HistoryItem, Platform } from '@/lib/api'

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
 * Lo mismo que leerResultado(), pero devolviendo SIEMPRE el mismo objeto mientras el
 * texto guardado no cambie.
 *
 * Existe para poder leerlo con `useSyncExternalStore`, que compara snapshots por
 * identidad: `leerResultado()` parsea el JSON en cada llamada y devuelve un objeto nuevo
 * cada vez, así que usarlo directo haría que React re-renderice para siempre.
 */
let crudoCacheado: string | null = null
let resultadoCacheado: ResultadoGuardado | null = null

export function leerResultadoEstable(): ResultadoGuardado | null {
  if (typeof window === 'undefined') return null
  let raw: string | null = null
  try {
    raw = window.sessionStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
  if (raw !== crudoCacheado) {
    crudoCacheado = raw
    try {
      resultadoCacheado = raw ? (JSON.parse(raw) as ResultadoGuardado) : null
    } catch {
      resultadoCacheado = null
    }
  }
  return resultadoCacheado
}

/**
 * sessionStorage no emite eventos para la propia pestaña, y estas pantallas lo leen una
 * sola vez al abrirse: no hay nada a qué suscribirse. La función existe porque
 * useSyncExternalStore la pide.
 */
export function sinSuscripcion(): () => void {
  return () => {}
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
    language: item.language,
  }
}

/**
 * Lo que /analizando necesita para verificar contenido que no es una URL (una
 * imagen que alguien subió o pegó, ya leída y confirmada en el dashboard).
 *
 * Va por sessionStorage y no por query params por lo obvio: el texto de una
 * publicación no entra en una URL, y además no tiene por qué quedar escrito en
 * el historial del navegador. La imagen NO viaja acá — para esta altura ya se
 * descartó; lo único que sigue vivo es la transcripción.
 */
export interface ContenidoPendiente {
  kind: ClientContentKind
  text: string
  platform: Platform | null
  author: string | null
  /** Etiqueta corta de dónde salió, para mostrar mientras analiza. */
  etiqueta: string
}

const CONTENIDO_KEY = 'aletheia_contenido_pendiente'

export function guardarContenidoPendiente(contenido: ContenidoPendiente) {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(CONTENIDO_KEY, JSON.stringify(contenido))
  } catch {
    // Storage bloqueado o lleno: se pierde el pase a /analizando, no la sesión.
  }
}

export function leerContenidoPendiente(): ContenidoPendiente | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(CONTENIDO_KEY)
    return raw ? (JSON.parse(raw) as ContenidoPendiente) : null
  } catch {
    return null
  }
}

export function limpiarContenidoPendiente() {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.removeItem(CONTENIDO_KEY)
  } catch {
    // idem
  }
}
