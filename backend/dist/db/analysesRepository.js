"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveAnalysis = saveAnalysis;
const pool_js_1 = require("./pool.js");
/**
 * Guarda el resultado de un análisis exitoso. No propaga errores: si la DB no está
 * configurada o el insert falla, loguea y devuelve false, para no tirar abajo la
 * respuesta de /analyze por un problema de persistencia (funcionalidad secundaria,
 * no bloqueante para el usuario).
 */
async function saveAnalysis(scraped, analysis) {
    try {
        const pool = await (0, pool_js_1.getPool)();
        await pool.query(`INSERT INTO analyses
        (url, title, scrape_method, score, label, summary, explanation, claim_vs_evidence, sources, tone_flags)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`, [
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
        ]);
        return true;
    }
    catch (err) {
        console.error("No se pudo guardar el análisis en la DB:", err instanceof Error ? err.message : err);
        return false;
    }
}
