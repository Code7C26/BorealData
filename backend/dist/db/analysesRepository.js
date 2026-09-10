"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveAnalysis = saveAnalysis;
exports.getAnalysesByUserId = getAnalysesByUserId;
exports.getAnalysisById = getAnalysisById;
const pool_js_1 = require("./pool.js");
/**
 * Guarda el resultado de un análisis exitoso y devuelve su id (para armar el link
 * público de /resultado/:id). No propaga errores: si la DB no está configurada o el
 * insert falla, loguea y devuelve null, para no tirar abajo la respuesta de /analyze
 * por un problema de persistencia (funcionalidad secundaria, no bloqueante para el
 * usuario) — en ese caso simplemente no hay nada para compartir.
 *
 * `userId` es el id interno (uuid, tabla `users`) del usuario autenticado, ya resuelto
 * por upsertUser() en usersRepository.ts — no el uid de Firebase. Se pasa `null` cuando
 * el análisis se hizo sin login (ver auth/verifyAuth.ts::attachUserIfPresent).
 */
async function saveAnalysis(scraped, analysis, userId = null) {
    try {
        const pool = await (0, pool_js_1.getPool)();
        const result = await pool.query(`INSERT INTO analyses
        (url, title, scrape_method, score, label, summary, explanation, claim_vs_evidence, sources, tone_flags, user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id`, [
            scraped.url,
            scraped.title,
            scraped.method,
            analysis.score,
            analysis.label,
            analysis.summary,
            analysis.explanation,
            analysis.claimVsEvidence,
            JSON.stringify(analysis.sources),
            JSON.stringify(analysis.toneFlags),
            userId,
        ]);
        return result.rows[0]?.id ?? null;
    }
    catch (err) {
        console.error("No se pudo guardar el análisis en la DB:", err instanceof Error ? err.message : err);
        return null;
    }
}
// pg devuelve las columnas jsonb ya parseadas (sources/tone_flags), no hace falta
// JSON.parse acá.
function mapRow(row) {
    return {
        id: row.id,
        url: row.url,
        title: row.title,
        scrapeMethod: row.scrape_method,
        score: row.score,
        label: row.label,
        summary: row.summary,
        explanation: row.explanation,
        claimVsEvidence: row.claim_vs_evidence,
        sources: row.sources,
        toneFlags: row.tone_flags,
        createdAt: row.created_at.toISOString(),
    };
}
const ANALYSIS_COLUMNS = "id, url, title, scrape_method, score, label, summary, explanation, claim_vs_evidence, sources, tone_flags, created_at";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/**
 * Trae el historial de análisis de un usuario, más recientes primero.
 *
 * A diferencia de saveAnalysis(), acá el error SÍ se propaga (no hay try/catch que
 * devuelva un valor por defecto): /history no tiene un fallback razonable si la DB
 * falla, es la única fuente del dato, así que quien llama (routes/history.ts) es
 * responsable de atajar la excepción y devolver el 500.
 */
async function getAnalysesByUserId(userId, limit, offset) {
    const pool = await (0, pool_js_1.getPool)();
    const result = await pool.query(`SELECT ${ANALYSIS_COLUMNS}
     FROM analyses
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`, [userId, limit, offset]);
    return result.rows.map(mapRow);
}
/**
 * Trae un análisis puntual por id, sin importar de qué usuario es — es el punto de
 * entrada de la ruta pública GET /analyses/:id (el link de "Compartir resultado"),
 * pensada para que cualquiera con el link pueda ver ese análisis puntual, esté
 * logueado o no. El id es un uuid prácticamente imposible de adivinar, así que no hace
 * falta un chequeo de dueño para este caso de uso (a diferencia de /history, que sí
 * filtra por usuario).
 *
 * Devuelve null tanto si el id no tiene forma de uuid como si no existe — mismo
 * resultado (404) para el caller en routes/analyses.ts, evitamos que un id con formato
 * inválido llegue a romper la query en Postgres.
 */
async function getAnalysisById(id) {
    if (!UUID_PATTERN.test(id))
        return null;
    const pool = await (0, pool_js_1.getPool)();
    const result = await pool.query(`SELECT ${ANALYSIS_COLUMNS} FROM analyses WHERE id = $1`, [id]);
    const row = result.rows[0];
    return row ? mapRow(row) : null;
}
