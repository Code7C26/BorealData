import { Router, type Request, type Response } from "express";
import { scrapeUrl } from "../scraper/scrapeUrl.js";
import { analyzeContent } from "../gemini/analyzeContent.js";
import { saveAnalysis } from "../db/analysesRepository.js";
import { upsertUser } from "../db/usersRepository.js";
import { attachUserIfPresent } from "../auth/verifyAuth.js";

const router = Router();

/**
 * POST /analyze
 * Body: { "url": "https://..." }
 * Header opcional: Authorization: Bearer <Firebase ID token>
 *
 * Flujo: attachUserIfPresent (auth opcional) -> scrapeUrl() -> analyzeContent() ->
 * si hay usuario autenticado, upsertUser() para resolver su id interno -> guarda en
 * Cloud SQL -> responde con el resultado combinado. Solo se guardan los análisis
 * exitosos (200); si el guardado falla no se rompe la respuesta (ver saveAnalysis).
 *
 * La autenticación es opcional a propósito: /analyze sigue funcionando sin login (ej.
 * desde la extensión), pero si viene un token válido el análisis queda asociado al
 * usuario (user_id). Para exigir login en una ruta, usar requireAuth en su lugar.
 */
router.post("/analyze", attachUserIfPresent, async (req: Request, res: Response) => {
  const { url } = req.body ?? {};

  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "Falta el campo 'url' (string) en el body." });
  }

  try {
    const scraped = await scrapeUrl(url);

    if (!scraped.success) {
      return res.status(422).json({
        error: "No se pudo extraer contenido de la URL.",
        scraped,
      });
    }

    const analysis = await analyzeContent(scraped);

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

    const userId = req.user ? await upsertUser(req.user.uid, req.user.email) : null;
    await saveAnalysis(scraped, analysis, userId);

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
  } catch (err) {
    return res.status(500).json({
      error: "Error inesperado en /analyze.",
      detail: err instanceof Error ? err.message : "Error desconocido.",
    });
  }
});

export default router;
