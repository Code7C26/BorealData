
export type VeracityLabel =
  | "verdadero"
  | "mayormente_verdadero"
  | "mixto"
  | "mayormente_falso"
  | "falso"
  | "no_verificable";

export interface AnalysisResult {
  /** Porcentaje de veracidad, 0 a 100. */
  score: number;
  /** Etiqueta categórica derivada del score + señales cualitativas. */
  label: VeracityLabel;
  /** Explicación en lenguaje natural del porqué del score. */
  explanation: string;
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
}
