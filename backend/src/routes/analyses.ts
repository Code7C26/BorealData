import { Router, type Request, type Response } from "express";
import {
  deleteAnalysisForUser,
  esFaltaDePermiso,
  esMigracionDeCompartirFaltante,
  getAnalysisById,
  shareAnalysisForUser,
} from "../db/analysesRepository.js";
import { upsertUser } from "../db/usersRepository.js";
import { attachUserIfPresent, requireAuth } from "../auth/verifyAuth.js";

const router = Router();

/**
 * GET /analyses/:id
 *
 * Auth OPCIONAL (attachUserIfPresent), que es lo que le permite servir dos cosas con la
 * misma URL:
 *
 *  - Sin sesión: un análisis público. Es el endpoint detrás de "Compartir verificación":
 *    cualquiera con el link (un uuid no adivinable) lo ve sin cuenta. Público es todo
 *    análisis de enlace, y una captura, texto o pregunta después de que su dueño lo
 *    compartió (POST /analyses/:id/share).
 *  - Con sesión: además, los análisis propios que NO son de un enlace (capturas,
 *    selecciones, texto pegado). getAnalysisById() los sirve solo a su dueño, por eso
 *    necesita saber quién mira. Sin esto, un análisis de captura no se podía abrir por
 *    su id ni siendo de uno mismo, y la única forma de verlo era el sessionStorage que
 *    dejaba la pantalla de análisis — así que recargar la página lo perdía.
 *
 * Un token inválido no corta la request: attachUserIfPresent la deja pasar como anónima,
 * y entonces esto responde lo mismo que para un visitante (el análisis si es público,
 * 404 si era una captura). Es el comportamiento correcto: un token vencido no debería
 * romper un link compartido.
 */
router.get("/analyses/:id", attachUserIfPresent, async (req: Request, res: Response) => {
  const { id } = req.params;

  if (typeof id !== "string") {
    return res.status(404).json({ error: "No encontramos ese análisis." });
  }

  try {
    // Solo si hay sesión: para un visitante anónimo no hay usuario que resolver (y no
    // corresponde escribir en `users` en un GET público).
    const viewerUserId = req.user ? await upsertUser(req.user.uid, req.user.email) : null;

    const analysis = await getAnalysisById(id, viewerUserId);

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

/**
 * POST /analyses/:id/share
 * Header obligatorio: Authorization: Bearer <Firebase ID token>.
 *
 * Lo llama el botón "Compartir verificación" antes de copiar el link: deja el análisis
 * visible para cualquiera con el link. Las capturas, textos y preguntas son privados hasta
 * este momento, y solo su dueño puede publicarlos. Es idempotente.
 *
 * 404 si el id no existe o es de otra persona (igual que el borrado, para no contar qué
 * ids existen). 503 si la base todavía no tiene backend/migrate-share.ts.
 */
router.post("/analyses/:id/share", requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params;

  if (typeof id !== "string") {
    return res.status(404).json({ error: "No encontramos ese análisis." });
  }

  try {
    const userId = await upsertUser(req.user!.uid, req.user!.email);

    if (!userId) {
      return res.status(500).json({ error: "No se pudo resolver el usuario en la base de datos." });
    }

    const compartido = await shareAnalysisForUser(id, userId);

    if (!compartido) {
      return res.status(404).json({ error: "No encontramos ese análisis." });
    }

    return res.status(200).json({ isPublic: true });
  } catch (err) {
    if (esMigracionDeCompartirFaltante(err)) {
      return res.status(503).json({
        error:
          "Compartir este tipo de análisis todavía no está habilitado en la base de datos." +
          " Falta correr backend/migrate-share.ts.",
      });
    }
    return res.status(500).json({
      error: "No se pudo compartir el análisis.",
      detail: err instanceof Error ? err.message : "Error desconocido.",
    });
  }
});

/**
 * DELETE /analyses/:id
 * Header obligatorio: Authorization: Bearer <Firebase ID token>.
 *
 * Borra un análisis propio. Acá la auth NO es opcional, al revés que en el GET: leer un
 * análisis de enlace es público, borrarlo nunca.
 *
 * Responde 404 tanto si el id no existe como si es de otra persona: son el mismo caso
 * desde afuera y distinguirlos contaría qué ids existen.
 */
router.delete("/analyses/:id", requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params;

  if (typeof id !== "string") {
    return res.status(404).json({ error: "No encontramos ese análisis." });
  }

  try {
    const userId = await upsertUser(req.user!.uid, req.user!.email);

    if (!userId) {
      return res.status(500).json({ error: "No se pudo resolver el usuario en la base de datos." });
    }

    const borrado = await deleteAnalysisForUser(id, userId);

    if (!borrado) {
      return res.status(404).json({ error: "No encontramos ese análisis." });
    }

    return res.status(200).json({ deleted: true });
  } catch (err) {
    if (esFaltaDePermiso(err)) {
      return res.status(503).json({
        error:
          "El borrado todavía no está habilitado en la base de datos. Falta correr" +
          " backend/migrate-delete.ts.",
      });
    }
    return res.status(500).json({
      error: "No se pudo borrar el análisis.",
      detail: err instanceof Error ? err.message : "Error desconocido.",
    });
  }
});

export default router;
