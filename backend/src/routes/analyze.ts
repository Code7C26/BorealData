import { Router, type Request, type Response } from "express";
import { scrapeUrl } from "../scraper/scrapeUrl.js";
import { analyzeContent } from "../gemini/analyzeContent.js";

const router = Router();

/**
 * POST /analyze
 * Body: { "url": "https://..." }
 *
 * Flujo: scrapeUrl() -> analyzeContent() -> responde con el resultado combinado.
 * Todavía sin guardado en Cloud SQL ni verificación JWT (queda para el siguiente paso).
 */
router.post("/analyze", async (req: Request, res: Response) => {
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

    return res.status(200).json({
      url: scraped.url,
      title: scraped.title,
      scrapeMethod: scraped.method,
      score: analysis.score,
      label: analysis.label,
      explanation: analysis.explanation,
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
