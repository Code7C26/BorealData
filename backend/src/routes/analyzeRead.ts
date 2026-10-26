import express, { Router, type NextFunction, type Request, type Response } from "express";
import { requireAuth } from "../auth/verifyAuth.js";
import { readCapture } from "../gemini/readCapture.js";
import { INVALID_LANGUAGE_ERROR, parseLanguage } from "../gemini/types.js";
import { validateImages } from "../utils/imageValidation.js";
import { readRateLimiter, READ_RATE_LIMIT } from "../utils/analyzeLimiter.js";

/**
 * Body máximo de /analyze/read: hasta 3 imágenes de 1 MB en base64 (~2,7 MB) + JSON.
 * El default de express.json() es 100 kB, que no alcanza ni para una imagen.
 */
const READ_BODY_LIMIT = "3mb";

const router = Router();

/**
 * POST /analyze/read  — paso 1 del análisis de contenido que el scraper no puede ver.
 * Body: { "images": [{ "dataBase64": "...", "mimeType": "image/jpeg" }],   (1 a 3 imágenes)
 *         "language": "es" | "en" }   // opcional, default "es": idioma de `mainClaim`
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
router.post(
  "/analyze/read",
  requireAuth,
  express.json({ limit: READ_BODY_LIMIT }),
  async (req: Request, res: Response) => {
    const validation = validateImages(req.body?.images);
    if (!validation.ok) {
      return res.status(400).json({ error: validation.error });
    }

    const language = parseLanguage(req.body?.language);
    if (!language) {
      return res.status(400).json({ error: INVALID_LANGUAGE_ERROR });
    }

    const rate = readRateLimiter.consume(req.user!.uid);
    if (!rate.allowed) {
      res.set("Retry-After", String(rate.retryAfterSeconds));
      return res.status(429).json({
        error: `Alcanzaste el límite de ${READ_RATE_LIMIT} lecturas por hora. Probá de nuevo en unos minutos.`,
      });
    }

    const result = await readCapture(validation.images, { language });

    if (!result.success || !result.reading) {
      const status = result.errorCode === "api" ? 502 : 422;
      return res.status(status).json({
        error: result.error ?? "No se pudo leer la imagen.",
        code: result.errorCode ?? "unreadable",
      });
    }

    return res.status(200).json({ reading: result.reading });
  }
);

/**
 * Errores del parser de este router como JSON (Express, por default, respondería HTML):
 * 413 si el body pasa el límite, 400 si no es JSON válido.
 */
router.use("/analyze/read", (err: unknown, _req: Request, res: Response, next: NextFunction) => {
  const type = (err as { type?: string } | null)?.type;
  if (type === "entity.too.large") {
    return res.status(413).json({ error: "El cuerpo de la request es demasiado grande. Reducí las imágenes." });
  }
  if (type === "entity.parse.failed") {
    return res.status(400).json({ error: "El cuerpo no es un JSON válido." });
  }
  return next(err);
});

export default router;
