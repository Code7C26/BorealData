import { ApiError } from '@/lib/api'
import type { Idioma } from '@/lib/idioma'

/**
 * Qué mostrar cuando falla una llamada al backend.
 *
 * El backend escribe sus errores en español (`{ error: "Alcanzaste el límite…" }`) y
 * esos textos son buenos: dicen qué pasó y qué hacer. En castellano se muestran tal
 * cual. En inglés no hay traducción de cada uno, así que se elige un mensaje por código
 * HTTP — menos específico, pero nunca un párrafo en otro idioma.
 */
const POR_STATUS_EN: Record<number, string> = {
  400: "The request wasn't valid. Check what you entered and try again.",
  401: 'Your session expired. Log in again to continue.',
  404: "We couldn't find what you were looking for.",
  413: "That's too large for us to analyze.",
  422: "We couldn't extract any content from that link.",
  429: "You've reached the limit of new analyses for now. Try again in a few minutes.",
  502: "The analysis engine didn't respond. Try again in a moment.",
  503: 'The service is temporarily unavailable. Try again in a moment.',
}

/** Solo para ApiError: cualquier otro error lo resuelve quien llama, como antes. */
export function mensajeDeError(err: unknown, idioma: Idioma, fallback: string): string {
  if (!(err instanceof ApiError)) return fallback
  if (idioma === 'es') return err.message
  return POR_STATUS_EN[err.status] ?? fallback
}
