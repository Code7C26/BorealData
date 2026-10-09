/**
 * Habilita el borrado de datos propios: le da DELETE al rol de aplicación sobre
 * `analyses`/`users` y crea las policies de Row Level Security que limitan ese DELETE a
 * las filas del usuario autenticado.
 *
 * ── Cómo correrlo ───────────────────────────────────────────────────────────────────
 * Hay que conectarse con el DUEÑO de las tablas (en local, `postgres`). El DATABASE_URL
 * del .env apunta al rol de la aplicación (`aletheia_app`), que justamente NO tiene
 * permiso para crear policies ni para repartir privilegios — con ese rol, este script
 * corta con un mensaje explicándolo.
 *
 * Para no tener que editar el .env (y después olvidarse de volverlo atrás, que ya pasó),
 * acepta una URL aparte solo para la migración:
 *
 *   MIGRATION_DATABASE_URL=postgres://postgres:TU_PASSWORD@localhost:5432/aletheia \
 *     npx tsx migrate-delete.ts
 *
 * Si no está seteada, usa DATABASE_URL.
 *
 * ── Qué hace ────────────────────────────────────────────────────────────────────────
 * Es re-corrible: GRANT es idempotente y las policies se recrean (DROP IF EXISTS +
 * CREATE). No toca el rol, no le cambia la password a nadie (a diferencia de
 * migrate-rls.ts, que resetea la password de `aletheia_app` cada vez que corre) y no
 * modifica ninguna fila de datos.
 *
 * Sin correr esto, DELETE /analyses/:id, DELETE /history y DELETE /me responden 503 con
 * un mensaje que lo dice, en vez de un 500 sin explicación.
 */
import "dotenv/config";
import pg from "pg";

const APP_ROLE = "aletheia_app";
const TABLAS = ["analyses", "users"] as const;

const POLICIES: Array<{ nombre: string; tabla: "users" | "analyses"; sql: string }> = [
  {
    nombre: "analyses_delete_own",
    tabla: "analyses",
    // Sin `bypass_owner_check`, a propósito: el bypass existe para LEER (el link público
    // de compartir y la caché por URL). Nadie puede borrar una fila que no es suya.
    sql: `CREATE POLICY analyses_delete_own ON analyses
            FOR DELETE
            USING (user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid)`,
  },
  {
    nombre: "users_delete_own",
    tabla: "users",
    sql: `CREATE POLICY users_delete_own ON users
            FOR DELETE
            USING (firebase_uid = current_setting('app.current_firebase_uid', true))`,
  },
];

async function main() {
  const connectionString = process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL;

  if (!connectionString) {
    console.error(
      "Falta MIGRATION_DATABASE_URL (o DATABASE_URL) en el entorno. Ver el comentario de" +
        " arriba de este archivo."
    );
    process.exit(1);
  }

  const client = new pg.Client({ connectionString });
  await client.connect();

  try {
    const { rows: yo } = await client.query<{ usuario: string }>(
      `SELECT current_user AS usuario`
    );
    console.log(`Conectado como: ${yo[0].usuario}`);

    // ── Chequeos previos, para fallar con un mensaje útil y no con un error de Postgres ──
    const { rows: dueños } = await client.query<{ tabla: string; dueño: string }>(
      `SELECT tablename AS tabla, tableowner AS "dueño"
         FROM pg_tables
        WHERE schemaname = 'public' AND tablename = ANY($1)`,
      [TABLAS]
    );

    if (dueños.length < TABLAS.length) {
      console.error(
        `\nNo encuentro las tablas ${TABLAS.join(" y ")} en este esquema. ¿Es la base correcta?`
      );
      process.exitCode = 1;
      return;
    }

    const ajenas = dueños.filter((t) => t.dueño !== yo[0].usuario);
    if (ajenas.length > 0) {
      console.error(
        `\nEste rol no es dueño de ${ajenas.map((t) => t.tabla).join(" ni de ")}` +
          ` (dueño: ${ajenas[0].dueño}), así que no puede crear las policies.\n\n` +
          "Volvé a correrlo con el dueño de las tablas, sin tocar el .env:\n\n" +
          `  MIGRATION_DATABASE_URL=postgres://${ajenas[0].dueño}:TU_PASSWORD@localhost:5432/TU_BASE \\\n` +
          "    npx tsx migrate-delete.ts\n"
      );
      process.exitCode = 1;
      return;
    }

    const { rowCount: existeRol } = await client.query(
      `SELECT 1 FROM pg_roles WHERE rolname = $1`,
      [APP_ROLE]
    );
    if (existeRol === 0) {
      console.error(
        `\nNo existe el rol ${APP_ROLE}. Corré primero migrate-rls.ts (una sola vez) y` +
          " recién después esta migración."
      );
      process.exitCode = 1;
      return;
    }

    console.log("\n== Permisos ==");
    await client.query(`GRANT DELETE ON public.analyses, public.users TO ${APP_ROLE}`);
    console.log(`  ok    GRANT DELETE sobre analyses y users para ${APP_ROLE}`);

    console.log("\n== Policies ==");
    for (const policy of POLICIES) {
      await client.query(`DROP POLICY IF EXISTS ${policy.nombre} ON ${policy.tabla}`);
      await client.query(policy.sql);
      console.log(`  ok    ${policy.nombre}`);
    }

    // ── Verificación real, no "asumo que salió bien" ──
    // Un GRANT sin derecho a otorgar no tira error: Postgres avisa con un WARNING y no
    // concede nada. Así que el único chequeo que vale es volver a leer los privilegios.
    console.log("\n== Verificación ==");
    const { rows: grants } = await client.query<{ table_name: string }>(
      `SELECT table_name
         FROM information_schema.table_privileges
        WHERE grantee = $1 AND privilege_type = 'DELETE' AND table_name = ANY($2)
        ORDER BY table_name`,
      [APP_ROLE, TABLAS]
    );
    const conDelete = grants.map((r) => r.table_name);
    console.log(`DELETE concedido en: ${conDelete.join(", ") || "(ninguna tabla)"}`);

    const { rows: pol } = await client.query<{ tablename: string; policyname: string }>(
      `SELECT tablename, policyname
         FROM pg_policies
        WHERE schemaname = 'public' AND cmd = 'DELETE'
        ORDER BY tablename`
    );
    console.log(
      `Policies de DELETE: ${pol.map((r) => `${r.tablename}.${r.policyname}`).join(", ") || "(ninguna)"}`
    );

    const faltan = TABLAS.filter((t) => !conDelete.includes(t));
    if (faltan.length > 0 || pol.length < POLICIES.length) {
      console.error(
        "\nLa migración NO quedó completa" +
          (faltan.length > 0 ? ` (falta el GRANT en: ${faltan.join(", ")})` : "") +
          ". El borrado va a seguir respondiendo 503."
      );
      process.exitCode = 1;
      return;
    }

    console.log("\n== Listo ==");
    console.log("Ninguna fila fue modificada. El borrado de datos ya está habilitado.");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
