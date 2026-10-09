import { Router, type Request, type Response } from "express";
import { requireAuth } from "../auth/verifyAuth.js";
import { deleteUserAccount, getUserProfile, upsertUser } from "../db/usersRepository.js";
import { esFaltaDePermiso } from "../db/analysesRepository.js";
import { stripControlChars } from "../utils/sanitize.js";

const router = Router();

const MAX_FULL_NAME_LENGTH = 200;

/**
 * GET /me
 * Header obligatorio: Authorization: Bearer <Firebase ID token>.
 *
 * Devuelve el perfil del usuario autenticado guardado en Postgres (id interno, email,
 * fullName). Llama a upsertUser() primero por si es la primera vez que este uid pega
 * contra el backend (mismo patrón que /analyze y /history) — así la fila siempre existe
 * antes de leerla.
 */
router.get("/me", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = await upsertUser(req.user!.uid, req.user!.email);

    if (!userId) {
      return res.status(500).json({ error: "No se pudo resolver el usuario en la base de datos." });
    }

    const profile = await getUserProfile(req.user!.uid);
    return res.status(200).json(profile);
  } catch (err) {
    return res.status(500).json({
      error: "No se pudo obtener el perfil.",
      detail: err instanceof Error ? err.message : "Error desconocido.",
    });
  }
});

/**
 * POST /me
 * Header obligatorio: Authorization: Bearer <Firebase ID token>.
 * Body: { "fullName": "Ciro Di Marsico" }
 *
 * Guarda (o actualiza) el nombre completo del usuario autenticado. Pensado para
 * llamarse justo después del registro con email/contraseña (con lo que tipeó el
 * usuario en el formulario) o después de un login con Google (con el nombre que ya
 * trae la cuenta de Google — el frontend lo saca de getAdditionalUserInfo(result).profile
 * en el momento del login, ya que Firebase no lo persiste solo).
 */
router.post("/me", requireAuth, async (req: Request, res: Response) => {
  const { fullName: rawFullName } = req.body ?? {};

  if (!rawFullName || typeof rawFullName !== "string") {
    return res.status(400).json({ error: "Falta el campo 'fullName' (string no vacío) en el body." });
  }

  const fullName = stripControlChars(rawFullName);

  if (fullName.length === 0) {
    return res.status(400).json({ error: "Falta el campo 'fullName' (string no vacío) en el body." });
  }

  if (fullName.length > MAX_FULL_NAME_LENGTH) {
    return res.status(400).json({
      error: `El campo 'fullName' no puede superar los ${MAX_FULL_NAME_LENGTH} caracteres.`,
    });
  }

  try {
    const userId = await upsertUser(req.user!.uid, req.user!.email, fullName);

    if (!userId) {
      return res.status(500).json({ error: "No se pudo guardar el nombre en la base de datos." });
    }

    return res.status(200).json({ id: userId, fullName });
  } catch (err) {
    return res.status(500).json({
      error: "Error inesperado al guardar el nombre.",
      detail: err instanceof Error ? err.message : "Error desconocido.",
    });
  }
});

/**
 * DELETE /me
 * Header obligatorio: Authorization: Bearer <Firebase ID token>.
 *
 * Borra de Postgres la cuenta del usuario autenticado y todos sus análisis, en una sola
 * transacción (ver deleteUserAccount).
 *
 * NO borra la cuenta de Firebase: eso lo hace el cliente con `deleteUser()` del SDK,
 * que es el único que tiene las credenciales frescas del usuario. El orden correcto del
 * lado del front es pegarle a este endpoint PRIMERO (mientras el ID token sigue siendo
 * válido) y recién después borrar la cuenta de Firebase — al revés, el token deja de
 * servir y las filas quedarían huérfanas en la base.
 */
router.delete("/me", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = await upsertUser(req.user!.uid, req.user!.email);

    if (!userId) {
      // No hay fila que borrar: la cuenta nunca llegó a existir del lado de Postgres.
      // Para el cliente es un éxito, que es lo único que le importa saber.
      return res.status(200).json({ deleted: true, analyses: 0 });
    }

    const { analyses } = await deleteUserAccount(req.user!.uid, userId);
    return res.status(200).json({ deleted: true, analyses });
  } catch (err) {
    if (esFaltaDePermiso(err)) {
      return res.status(503).json({
        error:
          "El borrado todavía no está habilitado en la base de datos. Falta correr" +
          " backend/migrate-delete.ts.",
      });
    }
    return res.status(500).json({
      error: "No se pudo borrar la cuenta.",
      detail: err instanceof Error ? err.message : "Error desconocido.",
    });
  }
});

export default router;
