import type { ScrapedContent } from "../scraper/types.js";
import type { AnalysisResult, GeminiOptions } from "./types.js";
import { callGemini } from "./geminiClient.js";

const MIN_TEXT_LENGTH_FOR_ANALYSIS = 200;

/**
 * Recibe el resultado del scraper y decide si tiene sentido mandarlo a Gemini
 * antes de gastar la llamada a la API.
 */
export async function analyzeContent(
  scraped: ScrapedContent,
  options: GeminiOptions = {}
): Promise<AnalysisResult> {
  if (!scraped.success) {
    return {
      score: 0,
      label: "no_verificable",
      explanation: "",
      toneFlags: [],
      success: false,
      error: "No se pudo analizar: el scraping del contenido falló previamente.",
    };
  }

  if (scraped.text.trim().length < MIN_TEXT_LENGTH_FOR_ANALYSIS) {
    return {
      score: 0,
      label: "no_verificable",
      explanation: "",
      toneFlags: [],
      success: false,
      error: `El contenido scrapeado es demasiado corto para un análisis confiable (mínimo ${MIN_TEXT_LENGTH_FOR_ANALYSIS} caracteres).`,
    };
  }

  return callGemini(scraped.title, scraped.text, options);
}
