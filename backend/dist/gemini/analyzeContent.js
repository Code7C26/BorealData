"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeContent = analyzeContent;
const geminiClient_js_1 = require("./geminiClient.js");
const MIN_TEXT_LENGTH_FOR_ANALYSIS = 200;
/** Resultado vacío con el veredicto honesto para cuando ni se llega a llamar a Gemini. */
function sinDatos(error) {
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
async function analyzeContent(scraped, options = {}) {
    if (!scraped.success) {
        return sinDatos("No se pudo analizar: el scraping del contenido falló previamente.");
    }
    if (scraped.text.trim().length < MIN_TEXT_LENGTH_FOR_ANALYSIS) {
        return sinDatos(`El contenido scrapeado es demasiado corto para un análisis confiable (mínimo ${MIN_TEXT_LENGTH_FOR_ANALYSIS} caracteres).`);
    }
    return (0, geminiClient_js_1.callGemini)(scraped.title, scraped.text, options);
}
