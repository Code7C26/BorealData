import { getPool } from "./pool.js";

/**
 * Crea (o actualiza el email de) la fila en `users` correspondiente a un usuario de
 * Firebase autenticado, y devuelve el id interno (uuid) para usarlo como FK en
 * `analyses.user_id`.
 *
 * Mismo patrón que saveAnalysis() en analysesRepository.ts: no propaga errores, loguea
 * y devuelve `null` si la DB falla, para que un problema de persistencia (funcionalidad
 * secundaria) nunca tumbe la respuesta 200 de /analyze.
 */
export async function upsertUser(firebaseUid: string, email: string | null): Promise<string | null> {
  try {
    const pool = await getPool();
    const result = await pool.query<{ id: string }>(
      `INSERT INTO users (firebase_uid, email)
       VALUES ($1, $2)
       ON CONFLICT (firebase_uid) DO UPDATE SET email = EXCLUDED.email
       RETURNING id`,
      [firebaseUid, email]
    );
    return result.rows[0]?.id ?? null;
  } catch (err) {
    console.error(
      "No se pudo crear/actualizar el usuario en la DB:",
      err instanceof Error ? err.message : err
    );
    return null;
  }
}
