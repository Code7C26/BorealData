/**
 * Contrato del módulo Gemini. Igual que en scraper/types.ts,
 * este archivo define la forma que usan geminiClient.ts y analyzeContent.ts.
 *
 * Rediseño V1 (sep-2026): se eliminó el `score` 0-100. Un porcentaje finge una
 * precisión decimal que el análisis no tiene ("72 % de veracidad" no significa
 * nada verificable), así que el veredicto pasó a ser una de CUATRO etiquetas
 * cerradas y la certeza a un nivel de CINCO escalones. Ver
 * "AletheIA Sistema · Design System V1.0", secciones 02 y 03.
 */

/** Veredicto sobre la afirmación central. Cuatro estados, ninguno numérico. */
export type Verdict = "verificado" | "dudoso" | "falso" | "sin-datos";

/** Nivel de confianza del análisis: 1 (muy baja) a 5 (muy alta). */
export type Confidence = 1 | 2 | 3 | 4 | 5;

/**
 * Postura de una fuente respecto a la afirmación central.
 * `origen` es la fuente donde apareció por primera vez la afirmación — se lista
 * aunque no confirme ni contradiga, porque la trazabilidad es parte del veredicto.
 */
export type SourceStance = "confirma" | "contradice" | "sin-datos" | "origen";

export interface AnalysisSource {
  /** Dominio a mostrar en la card, sin protocolo ni www (ej. "uio.no"). */
  domain: string;
  /** Título de la fuente/página consultada. Se usa como `title` del dominio truncado. */
  title: string;
  /**
   * URL real de la fuente, tomada de groundingChunks (nunca generada por el modelo).
   * null cuando el veredicto salió del análisis del propio texto, sin búsqueda externa.
   */
  url: string | null;
  /** Si esta fuente confirma, contradice, no tiene datos, o es el origen de la afirmación. */
  stance: SourceStance;
  /** Una línea explicando qué aporta esta fuente al veredicto. */
  note: string;
}

export interface AnalysisResult {
  /** Veredicto sobre la afirmación central. */
  verdict: Verdict;
  /** Nivel de confianza 1-5, ya normalizado contra el veredicto (ver normalizeVerdict). */
  confidence: Confidence;
  /**
   * Titular en lenguaje natural, NUNCA la etiqueta del veredicto
   * ("No encontramos respaldo para esta afirmación", no "FALSO").
   * La etiqueta vive aparte, en el chip.
   */
  headline: string;
  /** 1 a 2 oraciones que sostienen el titular con el dato concreto. */
  lead: string;
  /** Resumen corto de la noticia en sí (qué dice el artículo), no del veredicto. */
  summary: string;
  /** Los pasos del razonamiento, en orden, uno por oración. Entre 3 y 5. */
  reasoning: string[];
  /** Fuentes consultadas para llegar al veredicto (reales, cruzadas con groundingChunks). */
  sources: AnalysisSource[];
  /** Señales de tono/estilo detectadas (sensacionalismo, mayúsculas, etc). */
  toneFlags: string[];
  /** true si Gemini pudo generar un análisis coherente. */
  success: boolean;
  /** Mensaje de error si success es false. */
  error?: string;
}

/**
 * Rango de confianza válido por veredicto. Regla dura del sistema:
 * `sin-datos` nunca supera el nivel 2 y `falso`/`verificado` nunca bajan de 3.
 * Una combinación fuera de tabla degrada a `sin-datos` (ver normalizeVerdict).
 */
export const CONFIDENCE_RANGE: Record<Verdict, { min: Confidence; max: Confidence }> = {
  verificado: { min: 3, max: 5 },
  dudoso: { min: 2, max: 4 },
  falso: { min: 3, max: 5 },
  "sin-datos": { min: 1, max: 2 },
};

/**
 * Degrada combinaciones imposibles en vez de devolver una contradicción
 * ("Falso" con confianza "Muy baja" no es un veredicto, es no saber).
 * El mismo criterio corre en el front (lib/verdict.ts) como última defensa.
 */
export function normalizeVerdict(
  verdict: Verdict,
  confidence: Confidence
): { verdict: Verdict; confidence: Confidence } {
  const range = CONFIDENCE_RANGE[verdict];
  if (confidence < range.min || confidence > range.max) {
    return {
      verdict: "sin-datos",
      confidence: Math.min(confidence, 2) as Confidence,
    };
  }
  return { verdict, confidence };
}

export interface GeminiOptions {
  /** Modelo de Gemini a usar. Default: "gemini-2.5-flash". */
  model?: string;
  /** Máximo de caracteres del texto que se manda en el prompt (recorta artículos muy largos). */
  maxInputChars?: number;
  /**
   * Timeout de la llamada HTTP a Gemini, en ms. El SDK no tiene timeout por
   * default: sin esto, una llamada que Google nunca responde (o responde muy
   * tarde con `googleSearch` + un prompt largo) deja la request de /analyze
   * colgada para siempre. Artículos largos con búsqueda real pueden tardar
   * bastante (probado: consistentemente por encima de 90s). Default: 180000
   * (3 min).
   */
  timeoutMs?: number;
  /**
   * Qué tipo de contenido se está analizando. Solo cambia la redacción del prompt
   * (un posteo o una cadena no es un "artículo periodístico"); las reglas de veredicto
   * son las mismas. Default: "url" (el comportamiento de siempre).
   */
  contentKind?: ContentKind;
  /**
   * En qué idioma escribe el modelo los textos del análisis (headline, lead, summary,
   * reasoning, notas de las fuentes, toneFlags). Los valores enum (`verdict`, `stance`)
   * no se traducen nunca. Default: "es".
   */
  language?: Language;
}

// ── Idioma del análisis (oct-2026) ──────────────────────────────────────────
// La web es bilingüe (cookie `aletheia-idioma` en el front) y manda el idioma activo en
// el body de /analyze, /analyze/content y /analyze/read. La extensión todavía no lo
// manda: sin el campo, todo sigue en castellano, como siempre.

export const LANGUAGES = ["es", "en"] as const;
export type Language = (typeof LANGUAGES)[number];
export const DEFAULT_LANGUAGE: Language = "es";

/**
 * Lee el campo `language` de un body. Ausente (undefined/null) es el default; cualquier
 * otro valor que no sea "es" o "en" es un error del cliente y devuelve null, para que la
 * ruta responda 400 en vez de analizar en un idioma que nadie pidió.
 */
export function parseLanguage(raw: unknown): Language | null {
  if (raw === undefined || raw === null) return DEFAULT_LANGUAGE;
  return typeof raw === "string" && (LANGUAGES as readonly string[]).includes(raw)
    ? (raw as Language)
    : null;
}

/** Texto del 400 cuando `language` vino con un valor inválido (igual en las tres rutas). */
export const INVALID_LANGUAGE_ERROR = `El campo 'language' es inválido (opciones: ${LANGUAGES.join(", ")}).`;

// ── Contenido que el scraper no puede ver (sep-2026) ────────────────────────
// La extensión manda evidencia armada dentro de la pestaña del usuario (captura,
// selección, texto pegado) en vez de una URL que el servidor tendría que ir a buscar.
// Ver DOCS/BRIEF-captura-contenido-privado.md.

/** De dónde salió el contenido. "url" es el camino clásico (scraper); el resto es evidencia del cliente. */
export type ContentKind = "url" | "capture" | "selection" | "image" | "text";

/** Solo estos cuatro se aceptan desde el cliente en /analyze/content (nunca "url"). */
export const CLIENT_CONTENT_KINDS = ["capture", "selection", "image", "text"] as const;
export type ClientContentKind = (typeof CLIENT_CONTENT_KINDS)[number];

/** Plataformas reconocidas. Lo declara el cliente: es una pista, no un dato confiable. */
export const KNOWN_PLATFORMS = ["facebook", "instagram", "x", "whatsapp", "tiktok", "otro"] as const;
export type Platform = (typeof KNOWN_PLATFORMS)[number];

/** Qué tan legible quedó la imagen según el propio modelo lector. */
export type ReadingConfidence = "alta" | "media" | "baja";

/**
 * Paso 1 del pipeline de captura: lo que el modelo LEYÓ de la imagen, sin veredicto.
 * `text` es la transcripción tal cual (el usuario puede corregirla antes del paso 2).
 */
export interface CaptureReading {
  /** Plataforma que el modelo reconoce en la imagen (puede diferir de la pista del cliente). */
  platform: Platform | null;
  author: string | null;
  /** Fecha del posteo tal como aparece (texto libre: "hace 3 h", "12 sep 2026"). */
  postedAt: string | null;
  /** Transcripción textual de la publicación, sin resumir ni corregir. */
  text: string;
  /** La afirmación central verificable en una oración, o null si no hay ninguna. */
  mainClaim: string | null;
  /** Fuente que el propio posteo cita ("según la OMS…"), si cita alguna. */
  citedSource: string | null;
  /** false si es un meme, una frase sin afirmación comprobable o una imagen sin texto útil. */
  hasVerifiableClaim: boolean;
  readingConfidence: ReadingConfidence;
}

export interface ReadCaptureResult {
  success: boolean;
  reading: CaptureReading | null;
  error?: string;
  /** "blocked": el modelo rechazó la imagen por políticas de seguridad. "api": falla técnica. */
  errorCode?: "blocked" | "unreadable" | "api";
}
