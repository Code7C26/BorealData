"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.attachUserIfPresent = attachUserIfPresent;
exports.requireAuth = requireAuth;
const firebaseAdmin_js_1 = require("./firebaseAdmin.js");
require("./types.js");
function extractBearerToken(req) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer "))
        return null;
    const token = header.slice("Bearer ".length).trim();
    return token.length > 0 ? token : null;
}
/**
 * Verifica el ID token de Firebase si viene en el header `Authorization: Bearer <token>`
 * y, si es válido, adjunta `req.user`. NO bloquea la request si no hay token o si es
 * inválido — deja pasar como anónimo (`req.user` queda `undefined`).
 *
 * Sin uso actualmente (31-ago-2026): /analyze usaba este middleware para que la
 * extensión pudiera analizar sin login, pero se decidió requerir login en todas las
 * rutas (ver "Ruta /analyze — Detalle Técnico" en el contexto del proyecto) y ahora usa
 * `requireAuth`. Se deja este middleware definido por si en el futuro aparece alguna
 * ruta que sí necesite auth opcional.
 */
async function attachUserIfPresent(req, _res, next) {
    const token = extractBearerToken(req);
    if (!token)
        return next();
    try {
        const decoded = await (0, firebaseAdmin_js_1.getFirebaseAuth)().verifyIdToken(token);
        req.user = { uid: decoded.uid, email: decoded.email ?? null };
    }
    catch (err) {
        console.error("Token de Firebase inválido en /analyze, se ignora y se sigue como anónimo:", err instanceof Error ? err.message : err);
    }
    next();
}
/**
 * Exige un ID token de Firebase válido. Responde 401 si falta el header Authorization
 * o si el token es inválido/expiró. Usado en /analyze, /history y /me — todas las rutas
 * del backend requieren login (31-ago-2026).
 */
async function requireAuth(req, res, next) {
    const token = extractBearerToken(req);
    if (!token) {
        return res.status(401).json({ error: "Falta el header 'Authorization: Bearer <token>'." });
    }
    try {
        const decoded = await (0, firebaseAdmin_js_1.getFirebaseAuth)().verifyIdToken(token);
        req.user = { uid: decoded.uid, email: decoded.email ?? null };
        next();
    }
    catch (err) {
        return res.status(401).json({
            error: "Token inválido o expirado.",
            detail: err instanceof Error ? err.message : "Error desconocido.",
        });
    }
}
