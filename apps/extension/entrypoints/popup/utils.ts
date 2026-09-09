import type {
  AnalysisResult,
  BackendAnalyzeResponse,
  BackendVeracityLabel,
  Verdict,
} from './types';

/**
 * Devuelve una etiqueta corta para mostrar qué se analizó: el dominio si el
 * input es una URL válida, o un fragmento del texto pegado.
 */
export function getAnalyzedLabel(input: string): string {
  const trimmed = input.trim();
  try {
    return new URL(trimmed).hostname;
  } catch {
    return trimmed.length > 60 ? `${trimmed.slice(0, 60)}…` : trimmed;
  }
}

const VERDICT_POR_LABEL: Record<BackendVeracityLabel, Verdict> = {
  verdadero: 'confiable',
  mayormente_verdadero: 'confiable',
  // "mixto" y "no_verificable" no tienen un equivalente directo en el
  // veredicto de 3 estados de la extensión — "dudoso" es el más honesto.
  mixto: 'dudoso',
  no_verificable: 'dudoso',
  mayormente_falso: 'falso',
  falso: 'falso',
};

/** Adapta la respuesta real de POST /analyze al AnalysisResult que ya sabe renderizar ResultView. */
export function mapBackendResult(data: BackendAnalyzeResponse): AnalysisResult {
  return {
    verdict: VERDICT_POR_LABEL[data.label] ?? 'dudoso',
    score: data.score,
    summary: data.summary,
    signals: [data.explanation, ...data.toneFlags].filter(Boolean),
    sources: data.sources.map((source) => ({
      name: source.title,
      url: source.url ?? undefined,
    })),
  };
}
