"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.upsertUser = upsertUser;
exports.getUserProfile = getUserProfile;
const pool_js_1 = require("./pool.js");
/**
 * Crea (o actualiza el email de) la fila en `users` correspondiente a un usuario de
 * Firebase autenticado, y devuelve el id interno (uuid) para usarlo como FK en
 * `analyses.user_id`.
 *
 * `fullName` es opcional a propósito: /analyze y /history llaman a esta función en
 * cada request autenticado (para resolver el id interno) pero no conocen el nombre del
 * usuario, así que la llaman sin ese argumento. Solo POST /me (routes/me.ts) lo pasa,
 * después del registro o de un login con Google. Por eso el UPDATE usa COALESCE:
 * si `fullName` viene `null`/`undefined` (llamada desde /analyze o /history), se
 * conserva el valor que ya estaba guardado en vez de borrarlo.
 *
 * Mismo patrón que saveAnalysis() en analysesRepository.ts: no propaga errores, loguea
 * y devuelve `null` si la DB falla, para que un problema de persistencia (funcionalidad
 * secundaria) nunca tumbe la respuesta 200 de /analyze.
 */
async function upsertUser(firebaseUid, email, fullName) {
    try {
        const pool = await (0, pool_js_1.getPool)();
        const result = await pool.query(`INSERT INTO users (firebase_uid, email, full_name)
       VALUES ($1, $2, $3)
       ON CONFLICT (firebase_uid) DO UPDATE SET
         email = EXCLUDED.email,
         full_name = COALESCE(EXCLUDED.full_name, users.full_name)
       RETURNING id`, [firebaseUid, email, fullName ?? null]);
        return result.rows[0]?.id ?? null;
    }
    catch (err) {
        console.error("No se pudo crear/actualizar el usuario en la DB:", err instanceof Error ? err.message : err);
        return null;
    }
}
/**
 * Trae el perfil completo de un usuario por su uid de Firebase. Devuelve `null` si
 * todavía no existe la fila (no debería pasar si se llamó a upsertUser antes, como hace
 * GET /me).
 *
 * A diferencia de upsertUser(), acá el error SÍ se propaga — mismo criterio que
 * getAnalysesByUserId() en analysesRepository.ts: es una lectura, no hay fallback
 * razonable si la DB falla.
 */
async function getUserProfile(firebaseUid) {
    const pool = await (0, pool_js_1.getPool)();
    const result = await pool.query(`SELECT id, firebase_uid, email, full_name, created_at FROM users WHERE firebase_uid = $1`, [firebaseUid]);
    const row = result.rows[0];
    if (!row)
        return null;
    return {
        id: row.id,
        firebaseUid: row.firebase_uid,
        email: row.email,
        fullName: row.full_name,
        createdAt: row.created_at.toISOString(),
    };
}
