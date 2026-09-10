import { Router, type Request, type Response } from "express";
import { getGlobalStats } from "../db/analysesRepository.js";

const router = Router();

/**
 * GET /stats
 * Sin auth: son los totales públicos de la plataforma (no hay nada por usuario acá),
 * así que también los puede consumir la landing sin sesión.
 *
 * Devuelve { totalAnalyses, averageScore, totalSources } acumulados desde siempre:
 * ni "de hoy" ni "de este usuario". Son los números que muestran los 3 bloques del
 * dashboard, y suben con cada análisis nuevo que se guarda en /analyze.
 */
router.get("/stats", async (_req: Request, res: Response) => {
  try {
    const stats = await getGlobalStats();
    return res.status(200).json(stats);
  } catch (err) {
    return res.status(500).json({
      error: "No se pudieron obtener las estadísticas.",
      detail: err instanceof Error ? err.message : "Error desconocido.",
    });
  }
});

export default router;
