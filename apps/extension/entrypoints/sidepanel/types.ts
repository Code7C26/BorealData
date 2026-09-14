export interface AuthUser {
  name?: string;
  email?: string;
}

export interface AuthState {
  token: string;
  user?: AuthUser;
}

// Los tipos del veredicto (Verdict, Confidence, AnalysisResult, etc.) viven
// en @/lib/analysis — los necesita tanto este panel como background.ts.
