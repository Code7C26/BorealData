import { getPool } from "./pool.js";
import type { AnalysisResult } from "../gemini/types.js";
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
