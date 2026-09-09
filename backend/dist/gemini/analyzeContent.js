"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeContent = analyzeContent;
const geminiClient_js_1 = require("./geminiClient.js");
const MIN_TEXT_LENGTH_FOR_ANALYSIS = 200;
/**
 * Orquestador del módulo Gemini. Punto de entrada único desde afuera (rutas),
 * igual que scrapeUrl.ts es el punto de entrada del módulo scraper.
 *
 * Recibe el resultado del scraper y decide si tiene sentido mandarlo a Gemini
 * antes de gastar la llamada a la API.
 */
async function analyzeContent(scraped, options = {}) {
    if (!scraped.success) {
        return {
            score: 0,
            label: "no_verificable",
            summary: "",
            explanation: "",
            claimVsEvidence: "",
            sources: [],
            toneFlags: [],
            success: false,
            error: "No se pudo analizar: el scraping del contenido falló previamente.",
        };
    }
    if (scraped.text.trim().length < MIN_TEXT_LENGTH_FOR_ANALYSIS) {
        return {
            score: 0,
            label: "no_verificable",
            summary: "",
            explanation: "",
            claimVsEvidence: "",
            sources: [],
            toneFlags: [],
            success: false,
            error: `El contenido scrapeado es demasiado corto para un análisis confiable (mínimo ${MIN_TEXT_LENGTH_FOR_ANALYSIS} caracteres).`,
        };
    }
    return (0, geminiClient_js_1.callGemini)(scraped.title, scraped.text, options);
}
