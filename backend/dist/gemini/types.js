"use strict";
/**
 * Contrato del módulo Gemini. Igual que en scraper/types.ts,
 * este archivo define la forma que usan geminiClient.ts y analyzeContent.ts.
 *
 * Rediseño V1 (sep-2026): se eliminó el `score` 0-100. Un porcentaje finge una
 * precisión decimal que el análisis no tiene ("72 % de veracidad" no significa
 * nada verificable), así que el veredicto pasó a ser una de CUATRO etiquetas
 * cerradas y la certeza a un nivel de CINCO escalones. Ver
 * "AletheIA Sistema · Design System V1.0", secciones 02 y 03.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONFIDENCE_RANGE = void 0;
exports.normalizeVerdict = normalizeVerdict;
/**
 * Rango de confianza válido por veredicto. Regla dura del sistema:
 * `sin-datos` nunca supera el nivel 2 y `falso`/`verificado` nunca bajan de 3.
 * Una combinación fuera de tabla degrada a `sin-datos` (ver normalizeVerdict).
 */
exports.CONFIDENCE_RANGE = {
    verificado: { min: 3, max: 5 },
    dudoso: { min: 2, max: 4 },
    falso: { min: 3, max: 5 },
    "sin-datos": { min: 1, max: 2 },
};
/**
 * Degrada combinaciones imposibles en vez de devolver una contradicción
 * ("Falso" con confianza "Muy baja" no es un veredicto, es no saber).
 * El mismo criterio corre en el front (lib/verdict.ts) como última defensa.
 */
function normalizeVerdict(verdict, confidence) {
    const range = exports.CONFIDENCE_RANGE[verdict];
    if (confidence < range.min || confidence > range.max) {
        return {
            verdict: "sin-datos",
            confidence: Math.min(confidence, 2),
        };
    }
    return { verdict, confidence };
}
