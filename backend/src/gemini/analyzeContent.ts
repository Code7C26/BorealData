import type { ScrapedContent } from "../scraper/types.js";
import type { AnalysisResult, GeminiOptions } from "./types.js";
import { callGemini } from "./geminiClient.js";

const MIN_TEXT_LENGTH_FOR_ANALYSIS = 200;

/** Resultado vacío con el veredicto honesto para cuando ni se llega a llamar a Gemini. */
function sinDatos(error: string): AnalysisResult {
  return {
    verdict: "sin-datos",
    confidence: 1,
    headline: "",
    lead: "",
    summary: "",
    reasoning: [],
    sources: [],
    toneFlags: [],
    success: false,
    error,
  };
}

/**
 * Orquestador del módulo Gemini. Punto de entrada único desde afuera (rutas),
 * igual que scrapeUrl.ts es el punto de entrada del módulo scraper.
 *
 * Recibe el resultado del scraper y decide si tiene sentido mandarlo a Gemini
 * antes de gastar la llamada a la API.
 */
export async function analyzeContent(
  scraped: ScrapedContent,
  options: GeminiOptions = {}
): Promise<AnalysisResult> {
  if (!scraped.success) {
    return sinDatos("No se pudo analizar: el scraping del contenido falló previamente.");
  }

  if (scraped.text.trim().length < MIN_TEXT_LENGTH_FOR_ANALYSIS) {
    return sinDatos(
      `El contenido scrapeado es demasiado corto para un análisis confiable (mínimo ${MIN_TEXT_LENGTH_FOR_ANALYSIS} caracteres).`
    );
  }

  return callGemini(scraped.title, scraped.text, options);
}
