/**
 * Contrato del módulo Gemini. Igual que en scraper/types.ts,
 * este archivo define la forma que usan geminiClient.ts y analyzeContent.ts.
 */

export type VeracityLabel =
  | "verdadero"
  | "mayormente_verdadero"
  | "mixto"
  | "mayormente_falso"
  | "falso"
  | "no_verificable";

/** Postura de una fuente respecto a la afirmación central del artículo. */
export type SourceStance = "respalda" | "contradice" | "neutral_relacionada";

export interface AnalysisSource {
  /** Título de la fuente/página consultada. */
  title: string;
  /**
   * URL real de la fuente, tomada de groundingChunks (nunca generada por el modelo).
   * null cuando el veredicto salió del análisis del propio texto, sin búsqueda externa
   * (ej. contradicción interna obvia, tema trivial que no ameritó buscar).
   */
  url: string | null;
  /** Si esta fuente respalda, contradice, o solo se relaciona sin confirmar/negar. */
  stance: SourceStance;
  /** Explicación breve de qué aporta esta fuente al veredicto. */
  note: string;
}

export interface AnalysisResult {
  /** Porcentaje de veracidad, 0 a 100. */
  score: number;
  /** Etiqueta categórica derivada del score + señales cualitativas. */
  label: VeracityLabel;
  /** Resumen corto de la noticia en sí (qué dice el artículo), no del veredicto. */
  summary: string;
  /** Explicación en lenguaje natural del porqué del score. */
  explanation: string;
  /** Comparación directa entre lo que afirma el artículo y lo que muestra la evidencia. */
  claimVsEvidence: string;
  /** Fuentes consultadas para llegar al veredicto (reales, cruzadas con groundingChunks). */
  sources: AnalysisSource[];
  /** Señales de tono/estilo detectadas (sensacionalismo, mayúsculas, etc). */
  toneFlags: string[];
  /** true si Gemini pudo generar un análisis coherente. */
  success: boolean;
  /** Mensaje de error si success es false. */
  error?: string;
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
}
