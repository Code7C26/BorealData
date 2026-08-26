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
 * Decisión de diseño: /analyze sigue funcionando sin login (ej. desde la extensión, o
 * un usuario que todavía no inició sesión en la web), pero si viene un token válido el
 * análisis queda asociado a su user_id. Para una ruta que SÍ debe exigir login (ej. el
 * futuro GET /history), usar `requireAuth` en vez de este middleware.
 */
export async function attachUserIfPresent(req: Request, _res: Response, next: NextFunction) {
  const token = extractBearerToken(req);
  if (!token) return next();

  try {
    const decoded = await getFirebaseAuth().verifyIdToken(token);
    req.user = { uid: decoded.uid, email: decoded.email ?? null };
  } catch (err) {
    console.error(
      "Token de Firebase inválido en /analyze, se ignora y se sigue como anónimo:",
      err instanceof Error ? err.message : err
    );
  }

  next();
}

/**
 * Exige un ID token de Firebase válido. Responde 401 si falta el header Authorization
 * o si el token es inválido/expiró. Pensado para rutas que necesitan un usuario
 * logueado sí o sí (ej. el futuro GET /history).
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
