"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const scrapeUrl_js_1 = require("../scraper/scrapeUrl.js");
const analyzeContent_js_1 = require("../gemini/analyzeContent.js");
const analysesRepository_js_1 = require("../db/analysesRepository.js");
const router = (0, express_1.Router)();
/**
 * POST /analyze
 * Body: { "url": "https://..." }
 *
 * Flujo: scrapeUrl() -> analyzeContent() -> guarda en Cloud SQL -> responde con el
 * resultado combinado. Solo se guardan los análisis exitosos (200); si el guardado
 * falla no se rompe la respuesta (ver saveAnalysis). Todavía sin verificación JWT.
 */
router.post("/analyze", async (req, res) => {
    const { url } = req.body ?? {};
    if (!url || typeof url !== "string") {
        return res.status(400).json({ error: "Falta el campo 'url' (string) en el body." });
    }
    try {
        const scraped = await (0, scrapeUrl_js_1.scrapeUrl)(url);
        if (!scraped.success) {
            return res.status(422).json({
                error: "No se pudo extraer contenido de la URL.",
                scraped,
            });
        }
        const analysis = await (0, analyzeContent_js_1.analyzeContent)(scraped);
        if (!analysis.success) {
            return res.status(502).json({
                error: "El análisis con Gemini falló.",
                detail: analysis.error,
                scraped: {
                    url: scraped.url,
                    title: scraped.title,
                    method: scraped.method,
                },
            });
        }
        await (0, analysesRepository_js_1.saveAnalysis)(scraped, analysis);
        return res.status(200).json({
            url: scraped.url,
            title: scraped.title,
            scrapeMethod: scraped.method,
            score: analysis.score,
            label: analysis.label,
            summary: analysis.summary,
            explanation: analysis.explanation,
            claimVsEvidence: analysis.claimVsEvidence,
            sources: analysis.sources,
            toneFlags: analysis.toneFlags,
        });
    }
    catch (err) {
        return res.status(500).json({
            error: "Error inesperado en /analyze.",
            detail: err instanceof Error ? err.message : "Error desconocido.",
        });
    }
});
exports.default = router;
