import type { AnalyzeResponse, HistoryItem } from "@/lib/api";

const STORAGE_KEY = "aletheia_last_result";

export type ResultadoStatus = "ok" | "insuficiente" | "error";

/**
 * Resultado de un análisis (recién hecho en /analizando, o uno histórico
 * reabierto desde /historial), pasado a /resultado vía sessionStorage —
 * evita tener que volver a pegarle a /analyze (que gasta una llamada real a
 * Gemini) solo para renderizar la misma pantalla.
 */
export interface ResultadoGuardado {
  status: ResultadoStatus;
  tipo: string;
  valor: string;
  data?: AnalyzeResponse;
  /** ISO string — momento del análisis (ahora mismo, o `createdAt` si viene del historial). */
  fecha?: string;
  mensaje?: string;
}

export function guardarResultado(resultado: ResultadoGuardado) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(resultado));
}

export function leerResultado(): ResultadoGuardado | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ResultadoGuardado;
  } catch {
    return null;
  }
}

/** Adapta un HistoryItem (de /history o del link público /resultado/:id) al shape que ya sabe renderizar VistaVeredicto. */
export function historyItemToAnalyzeResponse(item: HistoryItem): AnalyzeResponse {
  return {
    id: item.id,
    url: item.url,
    title: item.title ?? item.url,
    scrapeMethod: item.scrapeMethod ?? "",
    score: item.score,
    label: item.label,
    summary: item.summary ?? "",
    explanation: item.explanation ?? "",
    claimVsEvidence: item.claimVsEvidence ?? "",
    sources: item.sources,
    toneFlags: item.toneFlags,
  };
}

/** Reabre un análisis ya guardado (de /historial o del sidebar) en /resultado, sin re-consultar el backend. */
export function guardarResultadoDesdeHistorial(item: HistoryItem) {
  guardarResultado({
    status: "ok",
    tipo: "url",
    valor: item.url,
    fecha: item.createdAt,
    data: historyItemToAnalyzeResponse(item),
  });
}
