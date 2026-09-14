/**
 * Prueba que las policies de RLS creadas por migrate-rls.ts realmente aíslan a los
 * usuarios entre sí, conectándose como el rol restringido `aletheia_app` (no como el
 * dueño de las tablas, que ignora RLS). Solo lee datos, no modifica nada.
 *
 * Correr con: npx tsx verify-rls.ts
 * (usa la misma $env:DATABASE_URL que ya tenés seteada en esta terminal, más la
 * password de aletheia_app que imprimió migrate-rls.ts)
 */
import "dotenv/config";
import pg from "pg";
import { getPool } from "./src/db/pool.js";

const APP_PASSWORD = process.argv[2];
if (!APP_PASSWORD) {
  console.error("Uso: npx tsx verify-rls.ts <password-de-aletheia_app>");
  process.exit(1);
}

async function withContext<T>(
  appPool: pg.Pool,
  ctx: { firebaseUid?: string; userId?: string; bypass?: boolean },
  fn: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  const client = await appPool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `SELECT set_config('app.current_firebase_uid', $1, true),
              set_config('app.current_user_id', $2, true),
              set_config('app.bypass_owner_check', $3, true)`,
      [ctx.firebaseUid ?? "", ctx.userId ?? "", ctx.bypass ? "true" : "false"]
    );
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } finally {
    client.release();
  }
}

async function main() {
  const ownerPool = await getPool();

  const users = await ownerPool.query<{ id: string; firebase_uid: string }>(
    `SELECT id, firebase_uid FROM users ORDER BY created_at LIMIT 2`
  );
  if (users.rows.length === 0) {
    console.log("No hay usuarios en la DB para probar. Nada que verificar.");
    await ownerPool.end();
    return;
  }

  const totalAnalyses = await ownerPool.query(`SELECT COUNT(*) FROM analyses`);
  console.log(`Total real de análisis en la DB: ${totalAnalyses.rows[0].count}`);

  const baseConnString = process.env.DATABASE_URL!;
  const appConnString = baseConnString.replace(
    /:\/\/[^:]+:[^@]+@/,
    `://aletheia_app:${encodeURIComponent(APP_PASSWORD)}@`
  );
  const appPool = new pg.Pool({ connectionString: appConnString, max: 2 });

  let allOk = true;
  const check = (label: string, ok: boolean) => {
    console.log(`  [${ok ? "OK" : "FALLO"}] ${label}`);
    if (!ok) allOk = false;
  };

  console.log("\n== analyses: usuario ve solo lo suyo ==");
  for (const user of users.rows) {
    const own = await ownerPool.query(`SELECT COUNT(*) FROM analyses WHERE user_id = $1`, [user.id]);
    const seenAsThemselves = await withContext(appPool, { userId: user.id }, (client) =>
      client.query(`SELECT COUNT(*) FROM analyses`)
    );
    check(
      `usuario ${user.id.slice(0, 8)}… ve exactamente sus ${own.rows[0].count} análisis (vio ${seenAsThemselves.rows[0].count})`,
      seenAsThemselves.rows[0].count === own.rows[0].count
    );
  }

  console.log("\n== analyses: un usuario random (inexistente) no ve nada ==");
  const fakeId = "00000000-0000-0000-0000-000000000000";
  const seenAsFake = await withContext(appPool, { userId: fakeId }, (client) =>
    client.query(`SELECT COUNT(*) FROM analyses`)
  );
  check("usuario inexistente ve 0 análisis", Number(seenAsFake.rows[0].count) === 0);

  console.log("\n== analyses: bypass (compartir/caché/stats) ve todo ==");
  const seenWithBypass = await withContext(appPool, { bypass: true }, (client) =>
    client.query(`SELECT COUNT(*) FROM analyses`)
  );
  check(
    `bypass ve el total real (${totalAnalyses.rows[0].count})`,
    seenWithBypass.rows[0].count === totalAnalyses.rows[0].count
  );

  console.log("\n== users: cada quien ve solo su propia fila ==");
  for (const user of users.rows) {
    const seenAsThemselves = await withContext(appPool, { firebaseUid: user.firebase_uid }, (client) =>
      client.query(`SELECT COUNT(*) FROM users`)
    );
    check(
      `usuario ${user.id.slice(0, 8)}… ve exactamente 1 fila de users (vio ${seenAsThemselves.rows[0].count})`,
      Number(seenAsThemselves.rows[0].count) === 1
    );
  }

  const seenAsFakeUid = await withContext(appPool, { firebaseUid: "uid-que-no-existe" }, (client) =>
    client.query(`SELECT COUNT(*) FROM users`)
  );
  check("firebase_uid inexistente ve 0 filas de users", Number(seenAsFakeUid.rows[0].count) === 0);

  await appPool.end();
  await ownerPool.end();

  console.log(`\n== Resultado final: ${allOk ? "TODO OK ✔" : "HAY FALLOS ✘"} ==`);
  process.exit(allOk ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
