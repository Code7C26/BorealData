import { getPool } from "./pool.js";
import type { AnalysisResult, AnalysisSource } from "../gemini/types.js";
import type { ScrapedContent } from "../scraper/types.js";

/**
 * Guarda el resultado de un análisis exitoso. No propaga errores: si la DB no está
 * configurada o el insert falla, loguea y devuelve false, para no tirar abajo la
 * respuesta de /analyze por un problema de persistencia (funcionalidad secundaria,
 * no bloqueante para el usuario).
 *
 * `userId` es el id interno (uuid, tabla `users`) del usuario autenticado, ya resuelto
 * por upsertUser() en usersRepository.ts — no el uid de Firebase. Se pasa `null` cuando
 * el análisis se hizo sin login (ver auth/verifyAuth.ts::attachUserIfPresent).
 */
export async function saveAnalysis(
  scraped: Pick<ScrapedContent, "url" | "title" | "method">,
  analysis: AnalysisResult,
  userId: string | null = null
): Promise<boolean> {
  try {
    const pool = await getPool();
    await pool.query(
      `INSERT INTO analyses
        (url, title, scrape_method, score, label, summary, explanation, claim_vs_evidence, sources, tone_flags, user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
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
      ]
    );
    return true;
  } catch (err) {
    console.error(
      "No se pudo guardar el análisis en la DB:",
      err instanceof Error ? err.message : err
    );
    return false;
  }
}

/** Forma de un análisis tal como lo devuelve GET /history (misma forma que la respuesta 200 de /analyze, más `id` y `createdAt`). */
export interface AnalysisHistoryItem {
  id: string;
  url: string;
  title: string | null;
  scrapeMethod: string | null;
  score: number;
  label: string;
  summary: string | null;
  explanation: string | null;
  claimVsEvidence: string | null;
  sources: AnalysisSource[];
  toneFlags: string[];
  createdAt: string;
}

/**
 * Trae el historial de análisis de un usuario, más recientes primero.
 *
 * A diferencia de saveAnalysis(), acá el error SÍ se propaga (no hay try/catch que
 * devuelva un valor por defecto): /history no tiene un fallback razonable si la DB
 * falla, es la única fuente del dato, así que quien llama (routes/history.ts) es
 * responsable de atajar la excepción y devolver el 500.
 */
export async function getAnalysesByUserId(
  userId: string,
  limit: number,
  offset: number
): Promise<AnalysisHistoryItem[]> {
  const pool = await getPool();
  const result = await pool.query<{
    id: string;
    url: string;
    title: string | null;
    scrape_method: string | null;
    score: number;
    label: string;
    summary: string | null;
    explanation: string | null;
    claim_vs_evidence: string | null;
    sources: AnalysisSource[];
    tone_flags: string[];
    created_at: Date;
  }>(
    `SELECT id, url, title, scrape_method, score, label, summary, explanation,
            claim_vs_evidence, sources, tone_flags, created_at
     FROM analyses
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );

  // pg devuelve las columnas jsonb ya parseadas (sources/tone_flags), no hace falta
  // JSON.parse acá.
  return result.rows.map((row) => ({
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
  }));
}
