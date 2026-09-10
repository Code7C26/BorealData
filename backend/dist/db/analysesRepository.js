"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveAnalysis = saveAnalysis;
exports.saveReusedAnalysis = saveReusedAnalysis;
exports.getAnalysesByUserId = getAnalysesByUserId;
exports.getAnalysisById = getAnalysisById;
exports.getAnalysisForUserByUrl = getAnalysisForUserByUrl;
exports.getLatestAnalysisByUrl = getLatestAnalysisByUrl;
exports.getGlobalStats = getGlobalStats;
const pool_js_1 = require("./pool.js");
/**
 * INSERT compartido por saveAnalysis() y saveReusedAnalysis() — mismo try/catch
 * best-effort. Devuelve el id de la fila insertada (para el link público de
 * /resultado/:id, ver getAnalysisById() más abajo), o null si el guardado falló.
 */
async function insertAnalysisRow(fields, userId) {
    try {
        const pool = await (0, pool_js_1.getPool)();
        const result = await pool.query(`INSERT INTO analyses
        (url, title, scrape_method, score, label, summary, explanation, claim_vs_evidence, sources, tone_flags, user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id`, [
            fields.url,
            fields.title,
            fields.scrapeMethod,
            fields.score,
            fields.label,
            fields.summary,
            fields.explanation,
            fields.claimVsEvidence,
            JSON.stringify(fields.sources),
            JSON.stringify(fields.toneFlags),
            userId,
        ]);
        return result.rows[0]?.id ?? null;
    }
    catch (err) {
        console.error("No se pudo guardar el análisis en la DB:", err instanceof Error ? err.message : err);
        return null;
    }
}
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
    return insertAnalysisRow({
        url: scraped.url,
        title: scraped.title,
        scrapeMethod: scraped.method,
        score: analysis.score,
        label: analysis.label,
        summary: analysis.summary,
        explanation: analysis.explanation,
        claimVsEvidence: analysis.claimVsEvidence,
        sources: analysis.sources,
        toneFlags: analysis.toneFlags,
    }, userId);
}
/**
 * Guarda una fila de historial para `userId` reutilizando un análisis ya hecho (por este
 * mismo usuario u otro) para la misma URL — sin volver a scrapear ni llamar a Gemini. Ver
 * getLatestAnalysisByUrl() y su uso en routes/analyze.ts. El id devuelto es el de esta
 * fila nueva (no el del análisis original del que se copiaron los campos).
 */
async function saveReusedAnalysis(cached, userId) {
    return insertAnalysisRow(cached, userId);
}
// pg devuelve las columnas jsonb ya parseadas (sources/tone_flags), no hace falta
// JSON.parse acá.
function mapAnalysisRow(row) {
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
    return result.rows.map(mapAnalysisRow);
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
    return row ? mapAnalysisRow(row) : null;
}
/**
 * Caché de deduplicación de /analyze (ver routes/analyze.ts). Dos lookups por `url`
 * exacta (usa el índice `analyses_url_idx`), en el orden en que /analyze los necesita:
 *
 * 1. getAnalysisForUserByUrl(): ¿este mismo usuario ya tiene un análisis para esta URL?
 *    Si sí, se devuelve tal cual — no hace falta insertar de nuevo (ese es justamente el
 *    bug reportado: la misma noticia duplicándose en el propio historial).
 * 2. getLatestAnalysisByUrl(): ¿CUALQUIER usuario ya analizó esta URL? Si sí, /analyze
 *    reusa esos campos (sin scrapear ni llamar a Gemini de nuevo) y solo inserta una fila
 *    liviana para que le aparezca en su historial a quien la pidió.
 *
 * Ninguna de las dos alcanza noticias iguales con URL distinta a propósito: contenido
 * "igual" bajo otra URL (o de un sitio sin respaldo) se vuelve a analizar siempre.
 *
 * Igual que saveAnalysis(), no propagan errores: son parte de una optimización, no la
 * única fuente del dato como en /history, así que si la DB falla acá /analyze tiene que
 * poder seguir con el flujo normal (scrapear + analizar) en vez de romperse con un 500.
 */
async function getAnalysisForUserByUrl(userId, url) {
    try {
        const pool = await (0, pool_js_1.getPool)();
        const result = await pool.query(`SELECT ${ANALYSIS_COLUMNS}
       FROM analyses
       WHERE user_id = $1 AND url = $2
       ORDER BY created_at DESC
       LIMIT 1`, [userId, url]);
        const row = result.rows[0];
        return row ? mapAnalysisRow(row) : null;
    }
    catch (err) {
        console.error("No se pudo buscar el análisis previo del usuario en la DB:", err instanceof Error ? err.message : err);
        return null;
    }
}
async function getLatestAnalysisByUrl(url) {
    try {
        const pool = await (0, pool_js_1.getPool)();
        const result = await pool.query(`SELECT ${ANALYSIS_COLUMNS}
       FROM analyses
       WHERE url = $1
       ORDER BY created_at DESC
       LIMIT 1`, [url]);
        const row = result.rows[0];
        return row ? mapAnalysisRow(row) : null;
    }
    catch (err) {
        console.error("No se pudo buscar el análisis previo por URL en la DB:", err instanceof Error ? err.message : err);
        return null;
    }
}
/**
 * Totales globales: no filtra por usuario ni por fecha, son los números de la
 * plataforma entera y solo crecen a medida que se analizan noticias.
 *
 * Igual que getAnalysesByUserId(), el error se propaga: la ruta decide qué responder.
 */
async function getGlobalStats() {
    const pool = await (0, pool_js_1.getPool)();
    const result = await pool.query(`SELECT COUNT(*)                          AS total_analyses,
            ROUND(AVG(score))                 AS average_score,
            SUM(jsonb_array_length(sources))  AS total_sources
     FROM analyses`);
    // COUNT/SUM/ROUND(AVG(...)) vuelven como string (bigint/numeric) desde pg.
    const row = result.rows[0];
    return {
        totalAnalyses: Number(row.total_analyses),
        averageScore: Number(row.average_score ?? 0),
        totalSources: Number(row.total_sources ?? 0),
    };
}
