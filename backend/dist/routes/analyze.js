"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const scrapeUrl_js_1 = require("../scraper/scrapeUrl.js");
const analyzeContent_js_1 = require("../gemini/analyzeContent.js");
const analysesRepository_js_1 = require("../db/analysesRepository.js");
const usersRepository_js_1 = require("../db/usersRepository.js");
const verifyAuth_js_1 = require("../auth/verifyAuth.js");
const router = (0, express_1.Router)();
/**
 * POST /analyze
 * Body: { "url": "https://..." }
 * Header obligatorio: Authorization: Bearer <Firebase ID token>
 *
 * Flujo: requireAuth (login obligatorio, corta con 401 si falta o el token es
 * inválido/expiró) -> scrapeUrl() -> analyzeContent() -> upsertUser() para resolver el
 * id interno del usuario -> guarda en Postgres -> responde con el resultado combinado.
 * Solo se guardan los análisis exitosos (200); si el guardado falla no se rompe la
 * respuesta (ver saveAnalysis).
 *
 * Cambio de diseño (31-ago-2026): antes la auth era opcional acá (attachUserIfPresent),
 * pensado para que la extensión pudiera analizar sin login. Se decidió requerir login
 * para las dos superficies (web y extensión) — entre otras cosas, cada análisis gasta
 * una llamada real a Gemini con grounding (costo real), y exigir cuenta ayuda a
 * controlar el abuso. La extensión ahora tiene que resolver su propio flujo de login
 * (ver "Ruta /analyze — Detalle Técnico" en el contexto del proyecto) antes de poder
 * llamar a este endpoint. Este chequeo del lado del servidor es el que realmente
 * importa: cualquier gate solo del lado del cliente (frontend/extensión) es únicamente
 * UX, no seguridad — se puede saltear pegándole directo al backend.
 */
router.post("/analyze", verifyAuth_js_1.requireAuth, async (req, res) => {
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
        // req.user siempre existe acá: requireAuth ya cortó la request con 401 si no.
        const userId = await (0, usersRepository_js_1.upsertUser)(req.user.uid, req.user.email);
        // id null si el guardado falla (best-effort, ver saveAnalysis) — el front
        // oculta el botón de "Compartir resultado" cuando no hay id.
        const id = await (0, analysesRepository_js_1.saveAnalysis)(scraped, analysis, userId);
        return res.status(200).json({
            id,
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
