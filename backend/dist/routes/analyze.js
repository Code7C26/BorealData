"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const scrapeUrl_js_1 = require("../scraper/scrapeUrl.js");
const analyzeContent_js_1 = require("../gemini/analyzeContent.js");
const analysesRepository_js_1 = require("../db/analysesRepository.js");
const usersRepository_js_1 = require("../db/usersRepository.js");
const verifyAuth_js_1 = require("../auth/verifyAuth.js");
const validateUrl_js_1 = require("../utils/validateUrl.js");
const sanitize_js_1 = require("../utils/sanitize.js");
const analyzeLimiter_js_1 = require("../utils/analyzeLimiter.js");
const MAX_URL_LENGTH = 2048;
// El rate limiter (20 análisis nuevos/hora por usuario) vive en utils/analyzeLimiter.ts y se
// comparte con /analyze/content: las dos gastan el mismo recurso caro (Gemini con grounding).
/** Forma de la respuesta 200 de /analyze, a partir de una fila ya guardada (cache hit). */
function responseFromCached(cached, id = cached.id) {
    return {
        id,
        url: cached.url,
        title: cached.title,
        scrapeMethod: cached.scrapeMethod,
        verdict: cached.verdict,
        confidence: cached.confidence,
        headline: cached.headline,
        lead: cached.lead,
        summary: cached.summary,
        reasoning: cached.reasoning,
        sources: cached.sources,
        toneFlags: cached.toneFlags,
    };
}
const router = (0, express_1.Router)();
/**
 * POST /analyze
 * Body: { "url": "https://..." }
 * Header obligatorio: Authorization: Bearer <Firebase ID token>
 *
 * Flujo: requireAuth (login obligatorio, corta con 401 si falta o el token es
 * inválido/expiró) -> upsertUser() para resolver el id interno del usuario -> caché por
 * URL exacta (ver getAnalysisForUserByUrl/getLatestAnalysisByUrl más abajo) -> si no hubo
 * cache hit, rate limit por uid (ver analyzeRateLimiter, corta con 429 si ya gastó su
 * cupo de análisis nuevos en la última hora) -> scrapeUrl() -> analyzeContent() -> guarda
 * en Postgres -> responde con el resultado combinado. Solo se guardan los análisis
 * exitosos (200); si el guardado falla no se rompe la respuesta (ver saveAnalysis).
 *
 * Caché por URL (10-sep-2026): analizar con Gemini tiene costo real (tokens + tiempo), y
 * antes /analyze repetía todo el flujo aunque la URL ya estuviera analizada — se veían
 * noticias duplicadas en el propio historial. Ahora, antes de scrapear:
 *   1. Si ESTE usuario ya tiene un análisis para esta URL exacta, se devuelve tal cual
 *      (ni insert nuevo: evita el duplicado que se veía en /history).
 *   2. Si no, pero CUALQUIER otro usuario ya la analizó, se reusan esos campos (sin
 *      scrapear ni llamar a Gemini de nuevo) y se inserta una fila liviana para este
 *      usuario, para que le aparezca en su propio historial.
 *   3. Si no hay ningún análisis previo para esta URL, se hace el flujo completo.
 * A propósito NO se intenta detectar "la misma noticia" bajo una URL distinta (otro
 * portal, parámetros de tracking, etc.) — el contenido puede haber cambiado o venir de
 * una fuente sin respaldo, así que una URL distinta siempre se analiza de nuevo.
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
    const { url: rawUrl } = req.body ?? {};
    if (!rawUrl || typeof rawUrl !== "string") {
        return res.status(400).json({ error: "Falta el campo 'url' (string) en el body." });
    }
    const url = (0, sanitize_js_1.stripControlChars)(rawUrl);
    if (url.length === 0) {
        return res.status(400).json({ error: "Falta el campo 'url' (string) en el body." });
    }
    if (url.length > MAX_URL_LENGTH) {
        return res.status(400).json({ error: "La URL es demasiado larga." });
    }
    const urlSafety = await (0, validateUrl_js_1.assertSafeAnalyzeUrl)(url);
    if (!urlSafety.safe) {
        return res.status(400).json({ error: urlSafety.reason });
    }
    try {
        // req.user siempre existe acá: requireAuth ya cortó la request con 401 si no.
        const userId = await (0, usersRepository_js_1.upsertUser)(req.user.uid, req.user.email);
        if (userId) {
            const ownAnalysis = await (0, analysesRepository_js_1.getAnalysisForUserByUrl)(userId, url);
            if (ownAnalysis) {
                return res.status(200).json(responseFromCached(ownAnalysis));
            }
            const existingAnalysis = await (0, analysesRepository_js_1.getLatestAnalysisByUrl)(url);
            if (existingAnalysis) {
                // La fila nueva es la de ESTE usuario: el link para compartir tiene que
                // apuntar a esa y no a la del usuario que lo analizo primero.
                const nuevoId = await (0, analysesRepository_js_1.saveReusedAnalysis)(existingAnalysis, userId);
                return res.status(200).json(responseFromCached(existingAnalysis, nuevoId));
            }
        }
        const rateCheck = analyzeLimiter_js_1.analyzeRateLimiter.consume(req.user.uid);
        if (!rateCheck.allowed) {
            res.set("Retry-After", String(rateCheck.retryAfterSeconds));
            return res.status(429).json({
                error: `Alcanzaste el límite de ${analyzeLimiter_js_1.ANALYZE_RATE_LIMIT} análisis nuevos por hora. Probá de nuevo en unos minutos.`,
            });
        }
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
        // userId ya se resolvió arriba (lo necesitó la caché) — no hace falta
        // llamar a upsertUser() de nuevo. id null si el guardado falla
        // (best-effort, ver saveAnalysis) — el front oculta el botón de
        // "Compartir resultado" cuando no hay id.
        const id = await (0, analysesRepository_js_1.saveAnalysis)(scraped, analysis, userId);
        return res.status(200).json({
            id,
            url: scraped.url,
            title: scraped.title,
            scrapeMethod: scraped.method,
            verdict: analysis.verdict,
            confidence: analysis.confidence,
            headline: analysis.headline,
            lead: analysis.lead,
            summary: analysis.summary,
            reasoning: analysis.reasoning,
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
