import { Router, type Request, type Response } from "express";
import { requireAuth } from "../auth/verifyAuth.js";
import { upsertUser } from "../db/usersRepository.js";
import { getAnalysesByUserId } from "../db/analysesRepository.js";

const router = Router();

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * GET /history
 * Header obligatorio: Authorization: Bearer <Firebase ID token> — requireAuth corta con
 * 401 si falta o es inválido/expiró (a diferencia de /analyze, acá el login NO es opcional).
 *
 * Query params opcionales:
 *   ?limit=20   (clampeado a [1, 100], default 20)
 *   ?offset=0   (default 0, para paginar "cargar más")
 *
 * Flujo: requireAuth valida el token -> upsertUser() resuelve (o crea, si es la primera
 * vez que este uid pega contra el backend) el id interno del usuario -> getAnalysesByUserId()
 * trae sus análisis, más recientes primero.
 *
 * A diferencia de /analyze (donde el guardado es best-effort y nunca rompe la respuesta),
 * acá un fallo de DB sí se devuelve como 500: /history no tiene otra fuente de datos.
 */
router.get("/history", requireAuth, async (req: Request, res: Response) => {
  const limitParam = Number(req.query.limit);
  const offsetParam = Number(req.query.offset);

  const limit =
    Number.isFinite(limitParam) && limitParam > 0
      ? Math.min(Math.floor(limitParam), MAX_LIMIT)
      : DEFAULT_LIMIT;
  const offset = Number.isFinite(offsetParam) && offsetParam >= 0 ? Math.floor(offsetParam) : 0;

  try {
    // req.user siempre existe acá: requireAuth ya cortó la request con 401 si no vino
    // un token válido.
    const userId = await upsertUser(req.user!.uid, req.user!.email);

    if (!userId) {
      return res.status(500).json({
        error: "No se pudo resolver el usuario en la base de datos.",
      });
    }

    const analyses = await getAnalysesByUserId(userId, limit, offset);

    return res.status(200).json({ analyses, limit, offset });
  } catch (err) {
    return res.status(500).json({
      error: "No se pudo obtener el historial.",
      detail: err instanceof Error ? err.message : "Error desconocido.",
    });
  }
});

export default router;
