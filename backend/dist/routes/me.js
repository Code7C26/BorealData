"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const verifyAuth_js_1 = require("../auth/verifyAuth.js");
const usersRepository_js_1 = require("../db/usersRepository.js");
const sanitize_js_1 = require("../utils/sanitize.js");
const router = (0, express_1.Router)();
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
router.get("/me", verifyAuth_js_1.requireAuth, async (req, res) => {
    try {
        const userId = await (0, usersRepository_js_1.upsertUser)(req.user.uid, req.user.email);
        if (!userId) {
            return res.status(500).json({ error: "No se pudo resolver el usuario en la base de datos." });
        }
        const profile = await (0, usersRepository_js_1.getUserProfile)(req.user.uid);
        return res.status(200).json(profile);
    }
    catch (err) {
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
router.post("/me", verifyAuth_js_1.requireAuth, async (req, res) => {
    const { fullName: rawFullName } = req.body ?? {};
    if (!rawFullName || typeof rawFullName !== "string") {
        return res.status(400).json({ error: "Falta el campo 'fullName' (string no vacío) en el body." });
    }
    const fullName = (0, sanitize_js_1.stripControlChars)(rawFullName);
    if (fullName.length === 0) {
        return res.status(400).json({ error: "Falta el campo 'fullName' (string no vacío) en el body." });
    }
    if (fullName.length > MAX_FULL_NAME_LENGTH) {
        return res.status(400).json({
            error: `El campo 'fullName' no puede superar los ${MAX_FULL_NAME_LENGTH} caracteres.`,
        });
    }
    try {
        const userId = await (0, usersRepository_js_1.upsertUser)(req.user.uid, req.user.email, fullName);
        if (!userId) {
            return res.status(500).json({ error: "No se pudo guardar el nombre en la base de datos." });
        }
        return res.status(200).json({ id: userId, fullName });
    }
    catch (err) {
        return res.status(500).json({
            error: "Error inesperado al guardar el nombre.",
            detail: err instanceof Error ? err.message : "Error desconocido.",
        });
    }
});
exports.default = router;
