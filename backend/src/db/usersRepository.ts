import { getPool } from "./pool.js";

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
export async function upsertUser(
  firebaseUid: string,
  email: string | null,
  fullName?: string | null
): Promise<string | null> {
  try {
    const pool = await getPool();
    const result = await pool.query<{ id: string }>(
      `INSERT INTO users (firebase_uid, email, full_name)
       VALUES ($1, $2, $3)
       ON CONFLICT (firebase_uid) DO UPDATE SET
         email = EXCLUDED.email,
         full_name = COALESCE(EXCLUDED.full_name, users.full_name)
       RETURNING id`,
      [firebaseUid, email, fullName ?? null]
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

/** Perfil de usuario tal como lo devuelve GET /me. */
export interface UserProfile {
  id: string;
  firebaseUid: string;
  email: string | null;
  fullName: string | null;
  createdAt: string;
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
export async function getUserProfile(firebaseUid: string): Promise<UserProfile | null> {
  const pool = await getPool();
  const result = await pool.query<{
    id: string;
    firebase_uid: string;
    email: string | null;
    full_name: string | null;
    created_at: Date;
  }>(
    `SELECT id, firebase_uid, email, full_name, created_at FROM users WHERE firebase_uid = $1`,
    [firebaseUid]
  );

  const row = result.rows[0];
  if (!row) return null;

  return {
    id: row.id,
    firebaseUid: row.firebase_uid,
    email: row.email,
    fullName: row.full_name,
    createdAt: row.created_at.toISOString(),
  };
}
