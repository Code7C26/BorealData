export interface AuthUser {
  name?: string;
  email?: string;
}

export interface AuthState {
  token: string;
  user?: AuthUser;
}

export type Verdict = 'confiable' | 'dudoso' | 'falso';

export interface AnalysisSource {
  name: string;
  url?: string;
}

export interface AnalysisResult {
  verdict: Verdict;
  /** Confianza del modelo, 0–100. Formato provisorio hasta tener el contrato real del backend. */
  score: number;
  summary: string;
  /** Señales que sostienen el veredicto — el diferencial de AletheIA es mostrar el razonamiento, no solo el resultado. */
  signals: string[];
  sources: AnalysisSource[];
}

/** Mismos labels que backend/src/gemini/types.ts (VeracityLabel). */
export type BackendVeracityLabel =
  | 'verdadero'
  | 'mayormente_verdadero'
  | 'mixto'
  | 'mayormente_falso'
  | 'falso'
  | 'no_verificable';

/** Respuesta 200 real de POST /analyze (backend/src/routes/analyze.ts). */
export interface BackendAnalyzeResponse {
  url: string;
  title: string;
  score: number;
  label: BackendVeracityLabel;
  summary: string;
  explanation: string;
  claimVsEvidence: string;
  sources: { title: string; url: string | null; stance: string; note: string }[];
  toneFlags: string[];
}
