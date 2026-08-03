import { Router, Request, Response } from "express";
import { scrapeUrl } from "../scraper/scrapeUrl";

const router = Router();

/**
 * Ruta de PRUEBA para validar el scraper de forma aislada,
 * sin pasar todavía por Gemini ni por la base de datos.
 *
 * POST /scrape-test
 * body: { "url": "https://..." }
 */
router.post("/", async (req: Request, res: Response) => {
  const { url } = req.body;

  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "Falta el campo 'url' (string) en el body" });
  }

  try {
    const resultado = await scrapeUrl(url);

    if (!resultado.success) {
      return res.status(422).json({
        error: "No se pudo extraer contenido de la URL",
        detalle: resultado.error,
        method_intentado: resultado.method,
      });
    }

    return res.status(200).json(resultado);
  } catch (err) {
    return res.status(500).json({
      error: "Error inesperado al scrapear",
      detalle: err instanceof Error ? err.message : "unknown_error",
    });
  }
});

export default router;