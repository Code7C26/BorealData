import { FixedWindowRateLimiter } from "./rateLimiter.js";
import type { Plan } from "../plan/config.js";

// Solo cuenta análisis reales (cache miss -> scrape + Gemini, o /analyze/content), no cache
// hits: ver el bloque de caché en routes/analyze.ts. Gemini con grounding tiene costo real por
// llamada, así que este límite protege ese costo, no la ruta en sí (que ya tiene su propio
// chequeo de auth). 20/hora es holgado para uso normal (nadie analiza 20 noticias distintas
// por hora a mano) pero frena un script que castigue el endpoint.
//
// Compartido entre /analyze y /analyze/content a propósito: las dos gastan el mismo recurso
// caro (el paso 2 con grounding), así que comparten presupuesto por usuario. Si fueran
// contadores separados, cada usuario podría gastar el doble.
//
// Esto es solo la RÁFAGA por hora. El cupo de cada plan (Gratuito por día, Premium por mes) vive en
// Postgres, no acá: ver plan/controlDeCupo.ts.
//
// Premium tiene su propia ráfaga, más alta: quien paga verifica en tandas (una demo, una
// redacción a la mañana) y 20 por hora se queda corto. Su tope de plata es el uso justo
// mensual, no esta ráfaga, que solo frena un script.
export const ANALYZE_RATE_LIMIT = 20;
export const ANALYZE_RATE_LIMIT_PREMIUM = 60;
export const ANALYZE_RATE_WINDOW_MS = 60 * 60 * 1000;
export const analyzeRateLimiter = new FixedWindowRateLimiter(ANALYZE_RATE_LIMIT, ANALYZE_RATE_WINDOW_MS);
const analyzeRateLimiterPremium = new FixedWindowRateLimiter(
  ANALYZE_RATE_LIMIT_PREMIUM,
  ANALYZE_RATE_WINDOW_MS
);

/** Consume una unidad de la ráfaga por hora del plan. `limite` es para el mensaje de error. */
export function consumirRafaga(
  uid: string,
  plan: Plan
): { allowed: boolean; retryAfterSeconds: number; limite: number } {
  const premium = plan === "premium";
  const resultado = (premium ? analyzeRateLimiterPremium : analyzeRateLimiter).consume(uid);
  return { ...resultado, limite: premium ? ANALYZE_RATE_LIMIT_PREMIUM : ANALYZE_RATE_LIMIT };
}

export function mensajeDeRafaga(limite: number): string {
  return `Alcanzaste el límite de ${limite} análisis nuevos por hora. Probá de nuevo en unos minutos.`;
}

// /analyze/read es una sola llamada corta, sin grounding y sin thinking: mucho más barata,
// pero no gratis (imágenes). Límite propio, más holgado, porque la persona puede releer
// varias veces hasta dar con el recorte correcto antes de verificar.
export const READ_RATE_LIMIT = 60;
export const READ_RATE_WINDOW_MS = 60 * 60 * 1000;
export const readRateLimiter = new FixedWindowRateLimiter(READ_RATE_LIMIT, READ_RATE_WINDOW_MS);
