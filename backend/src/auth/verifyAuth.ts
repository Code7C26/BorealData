import type { NextFunction, Request, Response } from "express";
import { getFirebaseAuth } from "./firebaseAdmin.js";
import "./types.js";

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  return token.length > 0 ? token : null;
}

/**
 * Verifica el ID token de Firebase si viene en el header `Authorization: Bearer <token>`
 * y, si es válido, adjunta `req.user`. NO bloquea la request si no hay token o si es
 * inválido — deja pasar como anónimo (`req.user` queda `undefined`).
 *
 * Lo usa GET /analyses/:id (8-oct-2026), que es justo el caso de auth opcional: sin
 * sesión sirve el análisis de un enlace público (el link de "Compartir verificación");
 * con sesión sirve además los análisis propios que no son de un enlace (capturas, texto
 * pegado), que solo puede ver su dueño. Antes lo usaba /analyze, cuando la extensión
 * podía analizar sin login; eso cambió el 31-ago-2026 y esa ruta pasó a `requireAuth`.
 */
export async function attachUserIfPresent(req: Request, _res: Response, next: NextFunction) {
  const token = extractBearerToken(req);
  if (!token) return next();

  try {
    const decoded = await getFirebaseAuth().verifyIdToken(token);
    req.user = { uid: decoded.uid, email: decoded.email ?? null };
  } catch (err) {
    console.error(
      "Token de Firebase inválido en una ruta de auth opcional, se sigue como anónimo:",
      err instanceof Error ? err.message : err
    );
  }

  next();
}

/**
 * Exige un ID token de Firebase válido. Responde 401 si falta el header Authorization
 * o si el token es inválido/expiró. Usado en /analyze, /history y /me — todas las rutas
 * del backend requieren login (31-ago-2026).
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = extractBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: "Falta el header 'Authorization: Bearer <token>'." });
  }

  try {
    const decoded = await getFirebaseAuth().verifyIdToken(token);
    req.user = { uid: decoded.uid, email: decoded.email ?? null };
    next();
  } catch (err) {
    return res.status(401).json({
      error: "Token inválido o expirado.",
      detail: err instanceof Error ? err.message : "Error desconocido.",
    });
  }
}
