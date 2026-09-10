import { Router, type Request, type Response } from "express";
import { getAnalysisById } from "../db/analysesRepository.js";

const router = Router();

/**
 * GET /analyses/:id
 * Sin auth a propósito: es el endpoint detrás del botón "Compartir resultado" de
 * /resultado — cualquiera con el link (id uuid, no adivinable) tiene que poder ver
 * ese análisis puntual sin necesitar cuenta. Ver getAnalysisById() para el porqué de
 * no filtrar por dueño acá (a diferencia de GET /history).
 */
router.get("/analyses/:id", async (req: Request, res: Response) => {
  const { id } = req.params;

  if (typeof id !== "string") {
    return res.status(404).json({ error: "No encontramos ese análisis." });
  }

  try {
    const analysis = await getAnalysisById(id);

    if (!analysis) {
      return res.status(404).json({ error: "No encontramos ese análisis." });
    }

    return res.status(200).json(analysis);
  } catch (err) {
    return res.status(500).json({
      error: "No se pudo obtener el análisis.",
      detail: err instanceof Error ? err.message : "Error desconocido.",
    });
  }
});

export default router;
