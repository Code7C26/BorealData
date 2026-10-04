"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runInUserTransaction = runInUserTransaction;
const pool_js_1 = require("./pool.js");
/**
 * Corre `fn` dentro de una transacción de Postgres con el contexto de usuario seteado
 * vía `set_config(..., is_local: true)`, que es lo que leen las policies de Row Level
 * Security de `users`/`analyses` (ver schema.sql). `is_local: true` es clave: el pool
 * reusa conexiones entre requests, así que si el contexto quedara seteado a nivel de
 * sesión (no LOCAL), un request de otro usuario podría heredar por error el contexto
 * del usuario anterior en esa misma conexión reciclada. LOCAL lo resetea solo con
 * COMMIT/ROLLBACK de esta transacción puntual.
 *
 * Cada llamada abre y cierra su propia transacción corta (una query, en general) —
 * a propósito no se comparte una transacción larga entre varias llamadas del
 * repositorio, para no tener un cliente del pool (son solo 5, ver pool.ts) bloqueado
 * mientras el request hace scraping o llama a Gemini (eso sí puede tardar minutos).
 */
async function runInUserTransaction(context, fn) {
    const pool = await (0, pool_js_1.getPool)();
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        await client.query(`SELECT set_config('app.current_firebase_uid', $1, true),
              set_config('app.current_user_id', $2, true),
              set_config('app.bypass_owner_check', $3, true)`, [context.firebaseUid ?? "", context.currentUserId ?? "", context.bypassOwnerCheck ? "true" : "false"]);
        const result = await fn(client);
        await client.query("COMMIT");
        return result;
    }
    catch (err) {
        await client.query("ROLLBACK").catch(() => { });
        throw err;
    }
    finally {
        client.release();
    }
}
