/**
 * Tipos y helpers del veredicto — compartidos entre el side panel y el
 * background script. El análisis ahora se dispara y se cachea en
 * background.ts (ver ese archivo) para sobrevivir al cierre del panel al
 * cambiar de pestaña; este módulo es lo que ambos lados necesitan en común.
 *
 * Espejo de backend/src/gemini/types.ts y de apps/lib/verdict.ts en la web.
 *
 * Rediseño V1 (sep-2026): se cayó el `score` 0-100 y los 6 labels viejos.
 * Ahora son cuatro veredictos cerrados y cinco niveles de confianza, que son
 * cosas distintas: el veredicto habla de la nota, la confianza habla de qué
 * tan sólida es la evidencia que conseguimos.
 */
export type Verdict = 'verificado' | 'dudoso' | 'falso' | 'sin-datos';
export type Confidence = 1 | 2 | 3 | 4 | 5;

/** `origen` es donde apareció por primera vez la afirmación. */
export type SourceStance = 'confirma' | 'contradice' | 'sin-datos' | 'origen';

export interface AnalysisSource {
  /** Dominio sin protocolo ni www — es lo que se muestra en la fila. */
  domain: string;
  title: string;
  url?: string;
  stance: SourceStance;
  note: string;
}

export interface AnalysisResult {
  /** Id de la fila guardada: arma el link a /resultado/:id. Falta si no se guardó. */
  id?: string | null;
  verdict: Verdict;
  confidence: Confidence;
  /** Frase en lenguaje natural. Nunca la etiqueta del veredicto. */
  headline: string;
  /** 1 a 2 oraciones con el dato concreto que sostiene el titular. */
  lead: string;
  /** De qué trata la nota (no el veredicto). */
  summary: string;
  /** Los pasos del razonamiento, en orden. */
  reasoning: string[];
  sources: AnalysisSource[];
}

/** Respuesta 200 real de POST /analyze (backend/src/routes/analyze.ts). */
export interface BackendAnalyzeResponse {
  id?: string | null;
  url: string;
  title: string;
  verdict: Verdict;
  confidence: Confidence;
  headline: string;
  lead: string;
  summary: string;
  reasoning: string[];
  sources: {
    domain: string;
    title: string;
    url: string | null;
    stance: SourceStance;
    note: string;
  }[];
  toneFlags: string[];
}

/**
 * Rango de confianza válido por veredicto. Regla dura del sistema:
 * `sin-datos` nunca supera el nivel 2 y `falso`/`verificado` nunca bajan de 3.
 */
const RANGO: Record<Verdict, { min: Confidence; max: Confidence }> = {
  verificado: { min: 3, max: 5 },
  dudoso: { min: 2, max: 4 },
  falso: { min: 3, max: 5 },
  'sin-datos': { min: 1, max: 2 },
};

/**
 * Degrada una combinación imposible en vez de mostrar una contradicción.
 * El backend ya normaliza antes de guardar; esto es la última defensa del
 * cliente para análisis viejos (cacheados) o una respuesta manipulada en el camino.
 */
export function normalize(verdict: Verdict, confidence: Confidence) {
  const rango = RANGO[verdict];
  if (!rango) return { verdict: 'sin-datos' as Verdict, confidence: 1 as Confidence };
  if (confidence < rango.min || confidence > rango.max) {
    return {
      verdict: 'sin-datos' as Verdict,
      confidence: Math.min(confidence, 2) as Confidence,
    };
  }
  return { verdict, confidence };
}

/** Adapta la respuesta real de POST /analyze al AnalysisResult que renderiza ResultView. */
export function mapBackendResult(data: BackendAnalyzeResponse): AnalysisResult {
  const { verdict, confidence } = normalize(data.verdict, data.confidence);

  return {
    id: data.id ?? null,
    verdict,
    confidence,
    headline: data.headline,
    lead: data.lead,
    summary: data.summary,
    reasoning: data.reasoning ?? [],
    sources: (data.sources ?? []).map((source) => ({
      domain: source.domain || source.title,
      title: source.title,
      url: source.url ?? undefined,
      stance: source.stance,
      note: source.note,
    })),
  };
}
