import { runInUserTransaction } from "./context.js";

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
    return await runInUserTransaction({ firebaseUid }, async (client) => {
      const result = await client.query<{ id: string }>(
        `INSERT INTO users (firebase_uid, email, full_name)
         VALUES ($1, $2, $3)
         ON CONFLICT (firebase_uid) DO UPDATE SET
           email = EXCLUDED.email,
           full_name = COALESCE(EXCLUDED.full_name, users.full_name)
         RETURNING id`,
        [firebaseUid, email, fullName ?? null]
      );
      return result.rows[0]?.id ?? null;
    });
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
  return runInUserTransaction({ firebaseUid }, async (client) => {
    const result = await client.query<{
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
  });
}

/**
 * Borra la cuenta: primero los análisis del usuario, después su fila de `users`.
 *
 * El orden importa y no es por prolijidad: `analyses.user_id` tiene una FK a `users.id`
 * sin ON DELETE CASCADE, así que borrar el usuario primero falla por violación de clave
 * ajena. Las dos operaciones van en la MISMA transacción (un solo runInUserTransaction):
 * si algo falla a mitad de camino, no queda una cuenta sin análisis ni análisis
 * huérfanos.
 *
 * No borra la cuenta de Firebase: eso lo tiene que hacer el cliente con el usuario
 * logueado (deleteUser del SDK), porque es el único que tiene sus credenciales frescas.
 * El backend borra lo que es suyo: las filas de Postgres.
 */
export async function deleteUserAccount(
  firebaseUid: string,
  userId: string
): Promise<{ analyses: number }> {
  return runInUserTransaction({ firebaseUid, currentUserId: userId }, async (client) => {
    const analyses = await client.query(`DELETE FROM analyses WHERE user_id = $1`, [userId]);
    await client.query(`DELETE FROM users WHERE id = $1 AND firebase_uid = $2`, [
      userId,
      firebaseUid,
    ]);
    return { analyses: analyses.rowCount ?? 0 };
  });
}
