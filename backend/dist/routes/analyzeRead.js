"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importStar(require("express"));
const verifyAuth_js_1 = require("../auth/verifyAuth.js");
const readCapture_js_1 = require("../gemini/readCapture.js");
const imageValidation_js_1 = require("../utils/imageValidation.js");
const analyzeLimiter_js_1 = require("../utils/analyzeLimiter.js");
/**
 * Body máximo de /analyze/read: hasta 3 imágenes de 1 MB en base64 (~2,7 MB) + JSON.
 * El default de express.json() es 100 kB, que no alcanza ni para una imagen.
 */
const READ_BODY_LIMIT = "3mb";
const router = (0, express_1.Router)();
/**
 * POST /analyze/read  — paso 1 del análisis de contenido que el scraper no puede ver.
 * Body: { "images": [{ "dataBase64": "...", "mimeType": "image/jpeg" }] }   (1 a 3 imágenes)
 * Header obligatorio: Authorization: Bearer <Firebase ID token>
 *
 * Lee la imagen con un modelo multimodal y devuelve la transcripción ({ reading }) SIN
 * veredicto, para que la persona la revise/corrija ("Esto es lo que leímos") antes de
 * verificarla con POST /analyze/content. Ver DOCS/BRIEF-captura-contenido-privado.md.
 *
 * Privacidad: la imagen vive solo en memoria mientras dura esta request. No se guarda en
 * ningún lado y no se loguea (ni el body ni el resultado): esta ruta no toca la base.
 *
 * IMPORTANTE (index.ts): este router lleva su PROPIO express.json() con límite alto, así que
 * tiene que montarse ANTES del express.json() global. Si no, el global (100 kB) rechaza el
 * body con 413 antes de que llegue acá. Se autentica primero para no parsear 3 MB de un
 * request sin token.
 */
router.post("/analyze/read", verifyAuth_js_1.requireAuth, express_1.default.json({ limit: READ_BODY_LIMIT }), async (req, res) => {
    const validation = (0, imageValidation_js_1.validateImages)(req.body?.images);
    if (!validation.ok) {
        return res.status(400).json({ error: validation.error });
    }
    const rate = analyzeLimiter_js_1.readRateLimiter.consume(req.user.uid);
    if (!rate.allowed) {
        res.set("Retry-After", String(rate.retryAfterSeconds));
        return res.status(429).json({
            error: `Alcanzaste el límite de ${analyzeLimiter_js_1.READ_RATE_LIMIT} lecturas por hora. Probá de nuevo en unos minutos.`,
        });
    }
    const result = await (0, readCapture_js_1.readCapture)(validation.images);
    if (!result.success || !result.reading) {
        const status = result.errorCode === "api" ? 502 : 422;
        return res.status(status).json({
            error: result.error ?? "No se pudo leer la imagen.",
            code: result.errorCode ?? "unreadable",
        });
    }
    return res.status(200).json({ reading: result.reading });
});
/**
 * Errores del parser de este router como JSON (Express, por default, respondería HTML):
 * 413 si el body pasa el límite, 400 si no es JSON válido.
 */
router.use("/analyze/read", (err, _req, res, next) => {
    const type = err?.type;
    if (type === "entity.too.large") {
        return res.status(413).json({ error: "El cuerpo de la request es demasiado grande. Reducí las imágenes." });
    }
    if (type === "entity.parse.failed") {
        return res.status(400).json({ error: "El cuerpo no es un JSON válido." });
    }
    return next(err);
});
exports.default = router;
