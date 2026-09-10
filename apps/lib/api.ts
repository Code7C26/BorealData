import { auth } from "@/lib/firebase";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/** Mismos labels que backend/src/gemini/types.ts (VeracityLabel). */
export type VeracityLabel =
  | "verdadero"
  | "mayormente_verdadero"
  | "mixto"
  | "mayormente_falso"
  | "falso"
  | "no_verificable";

/** Mismo shape que backend/src/gemini/types.ts (SourceStance). */
export type SourceStance = "respalda" | "contradice" | "neutral_relacionada";

export interface AnalysisSource {
  title: string;
  url: string | null;
  stance: SourceStance;
  note: string;
}

/** Respuesta 200 de POST /analyze (backend/src/routes/analyze.ts). */
export interface AnalyzeResponse {
  /** null si el guardado en DB falló (best-effort) — sin id no hay link público para compartir. */
  id: string | null;
  url: string;
  title: string;
  scrapeMethod: string;
  score: number;
  label: VeracityLabel;
  summary: string;
  explanation: string;
  claimVsEvidence: string;
  sources: AnalysisSource[];
  toneFlags: string[];
}

/** Item de GET /history (backend/src/db/analysesRepository.ts::AnalysisHistoryItem). */
export interface HistoryItem {
  id: string;
  url: string;
  title: string | null;
  scrapeMethod: string | null;
  score: number;
  label: VeracityLabel;
  summary: string | null;
  explanation: string | null;
  claimVsEvidence: string | null;
  sources: AnalysisSource[];
  toneFlags: string[];
  createdAt: string;
}

export interface HistoryResponse {
  analyses: HistoryItem[];
  limit: number;
  offset: number;
}

/**
 * Respuesta de GET /stats (backend/src/db/analysesRepository.ts::GlobalStats).
 * Totales de toda la plataforma acumulados desde siempre — no son del día ni del
 * usuario logueado.
 */
export interface GlobalStats {
  totalAnalyses: number;
  averageScore: number;
  totalSources: number;
}

/** Respuesta de GET /me (backend/src/db/usersRepository.ts::UserProfile). */
export interface UserProfile {
  id: string;
  firebaseUid: string;
  email: string | null;
  fullName: string | null;
  createdAt: string;
}

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

/**
 * Fetch autenticado contra el backend: agrega el ID token de Firebase del
 * usuario actual (se refresca solo si está por vencer, ver docs de
 * `getIdToken` del SDK) y arma la URL completa con NEXT_PUBLIC_API_URL.
 */
export async function apiFetch<T>(
  path: string,
  options: { method?: string; body?: unknown } = {}
): Promise<T> {
  const idToken = await auth.currentUser?.getIdToken();

  const res = await fetch(`${API_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    // respuesta sin body (poco común, pero no debería romper el caller)
  }

  if (!res.ok) {
    const message =
      (data as { error?: string } | null)?.error ?? `Error ${res.status} llamando a ${path}`;
    throw new ApiError(res.status, message, data);
  }

  return data as T;
}

const VEREDICTO_POR_LABEL = {
  verdadero: "confiable",
  mayormente_verdadero: "confiable",
  mixto: "dudosa",
  mayormente_falso: "desinformacion",
  falso: "desinformacion",
  no_verificable: "no_verificable",
} as const;

export type Veredicto = (typeof VEREDICTO_POR_LABEL)[VeracityLabel];

export function mapLabelToVeredicto(label: VeracityLabel): Veredicto {
  return VEREDICTO_POR_LABEL[label] ?? "no_verificable";
}
