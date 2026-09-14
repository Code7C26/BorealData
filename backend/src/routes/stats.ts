import { Router, type Request, type Response } from "express";
import { getGlobalStats } from "../db/analysesRepository.js";

const router = Router();

/**
 * GET /stats
 * Sin auth: son los totales públicos de la plataforma (no hay nada por usuario acá),
 * así que también los puede consumir la landing sin sesión.
 *
 * Devuelve { totalAnalyses, totalSources, averageConfidence, verdicts } acumulados desde
 * siempre: ni "de hoy" ni "de este usuario". Son los números que muestran los bloques del
 * dashboard y la landing, y suben con cada análisis nuevo que se guarda en /analyze.
 *
 * Rediseño V1 (sep-2026): `averageScore` (porcentaje) salió del contrato junto con el
 * score. Lo reemplazan `averageConfidence` (1 a 5) y el reparto por veredicto.
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
