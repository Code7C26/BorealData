"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const verifyAuth_js_1 = require("../auth/verifyAuth.js");
const geminiClient_js_1 = require("../gemini/geminiClient.js");
const types_js_1 = require("../gemini/types.js");
const analysesRepository_js_1 = require("../db/analysesRepository.js");
const usersRepository_js_1 = require("../db/usersRepository.js");
const contentText_js_1 = require("../utils/contentText.js");
const pageUrl_js_1 = require("../utils/pageUrl.js");
const analyzeLimiter_js_1 = require("../utils/analyzeLimiter.js");
/** Mismo tope que maxInputChars de callGemini: rechazar es más honesto que recortar en silencio. */
const MAX_TEXT_CHARS = 12000;
/** "Murió el papa" son 13 caracteres y es justo lo que hay que poder verificar. */
const MIN_TEXT_CHARS = 8;
const MAX_TITLE_CHARS = 300;
const MAX_AUTHOR_CHARS = 100;
const PLATFORM_LABELS = {
    facebook: "Facebook",
    instagram: "Instagram",
    x: "X",
    whatsapp: "WhatsApp",
    tiktok: "TikTok",
    otro: "otra plataforma",
};
function isRecord(v) {
    return typeof v === "object" && v !== null && !Array.isArray(v);
}
const router = (0, express_1.Router)();
/**
 * POST /analyze/content — paso 2: verifica CONTENIDO que manda el cliente, en vez de una
 * URL que el servidor tendría que ir a buscar (y que, si es privada, solo vería el muro de login).
 * Header obligatorio: Authorization: Bearer <Firebase ID token>
 *
 * Body (solo texto: las imágenes se leen antes, en POST /analyze/read):
 * {
 *   "source":  { "kind": "capture" | "selection" | "image" | "text",
 *                "platform": "facebook" | ... | null,   // pista del cliente, no confiable
 *                "pageUrl": "https://..." | null,       // solo contexto: NUNCA se scrapea
 *                "capturedAt": "2026-09-23T18:00:00Z" },   // se ignora
 *   "content": { "title": "...", "text": "...", "author": "@usuario" }
 * }
 *
 * Responde con la MISMA forma que POST /analyze (id, url, title, scrapeMethod, verdict,
 * confidence, headline, lead, summary, reasoning, sources, toneFlags) más `shareable: false`,
 * así el panel reusa mapBackendResult()/ResultView sin cambios.
 *
 * Reglas de privacidad (no negociables, ver el brief):
 * - NO hay caché por URL, ni la del propio usuario ni la compartida entre usuarios: la
 *   misma pageUrl (instagram.com/) puede ser un posteo distinto cada vez, y el análisis de
 *   un posteo privado nunca puede servírsele a otra persona.
 * - `source_type` lo fija el servidor a partir de `kind` (validado contra una lista), y las
 *   consultas de caché de /analyze filtran `source_type = 'url'`.
 * - El texto del contenido no se persiste: saveAnalysis() recibe `text: ""` y solo guarda
 *   el análisis (resumen, razonamiento, fuentes). Tampoco se loguea.
 * - Si no se pudo resolver el usuario, no se guarda nada (no se dejan filas huérfanas de
 *   contenido privado).
 */
router.post("/analyze/content", verifyAuth_js_1.requireAuth, async (req, res) => {
    const body = isRecord(req.body) ? req.body : {};
    const source = isRecord(body.source) ? body.source : {};
    const content = isRecord(body.content) ? body.content : {};
    const kind = source.kind;
    if (typeof kind !== "string" || !types_js_1.CLIENT_CONTENT_KINDS.includes(kind)) {
        return res.status(400).json({
            error: `Falta 'source.kind' o es inválido (opciones: ${types_js_1.CLIENT_CONTENT_KINDS.join(", ")}).`,
        });
    }
    const contentKind = kind;
    if (typeof content.text !== "string") {
        return res.status(400).json({ error: "Falta 'content.text' (string) en el body." });
    }
    const text = (0, contentText_js_1.cleanContentText)(content.text);
    if (text.length < MIN_TEXT_CHARS) {
        return res.status(400).json({
            error: `El texto es demasiado corto para analizarlo (mínimo ${MIN_TEXT_CHARS} caracteres).`,
        });
    }
    if (text.length > MAX_TEXT_CHARS) {
        return res.status(400).json({
            error: `El texto es demasiado largo (máximo ${MAX_TEXT_CHARS} caracteres). Acortalo o analizá solo la parte relevante.`,
        });
    }
    if ((0, contentText_js_1.looksLikeUrl)(text)) {
        // Pegar un link en el cuadro de "texto de la noticia" es un caso real: en vez de gastar
        // Gemini en analizar una URL como si fuera un posteo, se le dice al cliente que use /analyze.
        return res.status(400).json({
            error: "Eso es un enlace, no un texto. Analizalo como URL.",
            code: "is_url",
        });
    }
    const platform = typeof source.platform === "string" && types_js_1.KNOWN_PLATFORMS.includes(source.platform)
        ? source.platform
        : null;
    const author = (0, contentText_js_1.cleanInlineText)(content.author, MAX_AUTHOR_CHARS);
    const pageUrl = (0, pageUrl_js_1.sanitizePageUrl)(source.pageUrl);
    const title = (0, contentText_js_1.cleanInlineText)(content.title, MAX_TITLE_CHARS) ??
        (author
            ? `Publicación de ${author}${platform ? ` en ${PLATFORM_LABELS[platform]}` : ""}`
            : platform
                ? `Publicación en ${PLATFORM_LABELS[platform]}`
                : "");
    try {
        const userId = await (0, usersRepository_js_1.upsertUser)(req.user.uid, req.user.email);
        const rate = analyzeLimiter_js_1.analyzeRateLimiter.consume(req.user.uid);
        if (!rate.allowed) {
            res.set("Retry-After", String(rate.retryAfterSeconds));
            return res.status(429).json({
                error: `Alcanzaste el límite de ${analyzeLimiter_js_1.ANALYZE_RATE_LIMIT} análisis nuevos por hora. Probá de nuevo en unos minutos.`,
            });
        }
        const analysis = await (0, geminiClient_js_1.callGemini)(title, text, { contentKind });
        if (!analysis.success) {
            return res.status(502).json({
                error: "El análisis con Gemini falló.",
                detail: analysis.error,
            });
        }
        let id = null;
        if (userId) {
            // saveAnalysis() solo recibe url/título/método: el texto original ni siquiera se le pasa.
            const stored = { url: pageUrl ?? "", title, method: "capture" };
            id = await (0, analysesRepository_js_1.saveAnalysis)(stored, analysis, userId, {
                sourceType: contentKind,
                capturePlatform: platform,
            });
        }
        return res.status(200).json({
            id,
            url: pageUrl ?? "",
            title,
            scrapeMethod: "capture",
            verdict: analysis.verdict,
            confidence: analysis.confidence,
            headline: analysis.headline,
            lead: analysis.lead,
            summary: analysis.summary,
            reasoning: analysis.reasoning,
            sources: analysis.sources,
            toneFlags: analysis.toneFlags,
            // El link público de "Compartir resultado" no aplica a contenido del cliente (ver
            // getAnalysisById): el front no debería ofrecer ese botón aunque haya `id`.
            shareable: false,
        });
    }
    catch (err) {
        return res.status(500).json({
            error: "Error inesperado en /analyze/content.",
            detail: err instanceof Error ? err.message : "Error desconocido.",
        });
    }
});
exports.default = router;
