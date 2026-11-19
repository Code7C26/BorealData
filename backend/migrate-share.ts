/**
 * Habilita "Compartir verificación" para capturas, textos y preguntas.
 *
 * Hasta ahora solo los análisis de enlace se podían abrir sin cuenta. Esto agrega la
 * columna `analyses.shared_at` (NULL = privado) y deja que el dueño la marque tocando
 * "Compartir verificación" (POST /analyses/:id/share). Un análisis sin marcar sigue siendo
 * privado como siempre.
 *
 * ── Cómo correrlo ───────────────────────────────────────────────────────────────────
 * Igual que migrate-delete.ts: con el DUEÑO de las tablas, no con `aletheia_app`.
 *
 *   read -s -p "password de postgres: " PGPASSWORD && echo && \
 *     PGUSER=postgres PGPASSWORD="$PGPASSWORD" npx tsx migrate-share.ts; unset PGPASSWORD
 *
 * ── Qué hace ────────────────────────────────────────────────────────────────────────
 *  1. ADD COLUMN shared_at timestamptz (sin default: todas las filas quedan privadas).
 *  2. GRANT UPDATE (shared_at) a `aletheia_app`. migrate-rls.ts ya le da UPDATE sobre toda
 *     la tabla; esto lo asegura igual en una base armada de otra forma.
 *  3. Policy analyses_update_own: hasta ahora no había policy de UPDATE, así que RLS lo
 *     negaba siempre. Con esta, el UPDATE solo alcanza filas propias.
 *  4. Reemplaza analyses_select_own_or_shared para que el bypass del link público también
 *     alcance a las filas con shared_at. La caché por URL y /stats no cambian: filtran
 *     `source_type = 'url'` explícitamente en sus queries.
 *
 * Re-corrible y no modifica ninguna fila. Sin correrlo, el backend sigue andando como antes
 * (los links de enlaces funcionan) y POST /analyses/:id/share responde 503.
 */
import "dotenv/config";
import pg from "pg";

const APP_ROLE = "aletheia_app";

const POLICIES: Array<{ nombre: string; sql: string }> = [
  {
    nombre: "analyses_select_own_or_shared",
    sql: `CREATE POLICY analyses_select_own_or_shared ON analyses
            FOR SELECT
            USING (
              user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
              OR (
                current_setting('app.bypass_owner_check', true) = 'true'
                AND (source_type = 'url' OR shared_at IS NOT NULL)
              )
            )`,
  },
  {
    nombre: "analyses_update_own",
    // Sin bypass: nadie publica un análisis que no es suyo.
    sql: `CREATE POLICY analyses_update_own ON analyses
            FOR UPDATE
            USING (user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid)
            WITH CHECK (user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid)`,
  },
];

/**
 * Arma la conexión del dueño de las tablas, en orden de preferencia:
 *
 *  1. `PGPASSWORD` (y opcionalmente PGUSER/PGHOST/PGPORT/PGDATABASE), que es la forma
 *     estándar de libpq. Es la recomendada: permite pasar la contraseña por una variable
 *     leída con `read -s`, sin que quede escrita en el comando ni en el historial del
 *     shell. Lo que falte se completa desde DATABASE_URL, así solo hace falta la
 *     contraseña y el usuario.
 *  2. `MIGRATION_DATABASE_URL`, una URL completa, para quien prefiera pasarla de una.
 *  3. `DATABASE_URL`, el del .env — que apunta al rol de la app y no va a tener permisos.
 *     Sirve igual: el script detecta que no es el dueño y explica qué hacer.
 */
function crearCliente(): pg.Client {
  if (process.env.PGPASSWORD) {
    const base = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL) : null;
    return new pg.Client({
      host: process.env.PGHOST ?? base?.hostname ?? "localhost",
      port: Number(process.env.PGPORT ?? base?.port ?? 5432),
      database: process.env.PGDATABASE ?? base?.pathname.slice(1) ?? "postgres",
      user: process.env.PGUSER ?? "postgres",
      password: process.env.PGPASSWORD,
    });
  }

  const connectionString = process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL;

  if (!connectionString) {
    console.error(
      "Falta la conexión. Pasá PGPASSWORD (con PGUSER si no es `postgres`), o bien" +
        " MIGRATION_DATABASE_URL. Ver el comentario de arriba de este archivo."
    );
    process.exit(1);
  }

  return new pg.Client({ connectionString });
}

async function main() {
  const client = crearCliente();
  await client.connect();

  try {
    const { rows: yo } = await client.query<{ usuario: string }>(`SELECT current_user AS usuario`);
    console.log(`Conectado como: ${yo[0].usuario}`);

    const { rows: tabla } = await client.query<{ dueño: string }>(
      `SELECT tableowner AS "dueño" FROM pg_tables WHERE schemaname = 'public' AND tablename = 'analyses'`
    );
    if (tabla.length === 0) {
      console.error("\nNo encuentro la tabla analyses en este esquema. ¿Es la base correcta?");
      process.exitCode = 1;
      return;
    }
    if (tabla[0].dueño !== yo[0].usuario) {
      console.error(
        `\nEste rol no es dueño de analyses (dueño: ${tabla[0].dueño}). Volvé a correrlo así:\n\n` +
          `  read -s -p "password de ${tabla[0].dueño}: " PGPASSWORD && echo && \\\n` +
          `    PGUSER=${tabla[0].dueño} PGPASSWORD="$PGPASSWORD" npx tsx migrate-share.ts; unset PGPASSWORD\n`
      );
      process.exitCode = 1;
      return;
    }

    const { rowCount: existeRol } = await client.query(`SELECT 1 FROM pg_roles WHERE rolname = $1`, [APP_ROLE]);
    if (existeRol === 0) {
      console.error(`\nNo existe el rol ${APP_ROLE}. Corré primero migrate-rls.ts.`);
      process.exitCode = 1;
      return;
    }

    // Todo o nada: una policy de SELECT a medio crear dejaría los links públicos caídos.
    await client.query("BEGIN");
    console.log("\n== Columna ==");
    await client.query(`ALTER TABLE analyses ADD COLUMN IF NOT EXISTS shared_at timestamptz`);
    console.log("  ok    analyses.shared_at");

    console.log("\n== Permisos ==");
    await client.query(`GRANT UPDATE (shared_at) ON public.analyses TO ${APP_ROLE}`);
    console.log(`  ok    GRANT UPDATE (shared_at) para ${APP_ROLE}`);

    console.log("\n== Policies ==");
    for (const policy of POLICIES) {
      await client.query(`DROP POLICY IF EXISTS ${policy.nombre} ON analyses`);
      await client.query(policy.sql);
      console.log(`  ok    ${policy.nombre}`);
    }
    await client.query("COMMIT");

    // Un GRANT sin derecho a otorgar no tira error (solo un WARNING): se verifica leyendo.
    console.log("\n== Verificación ==");
    const { rows: grant } = await client.query(
      `SELECT 1 FROM information_schema.column_privileges
        WHERE grantee = $1 AND table_name = 'analyses' AND column_name = 'shared_at'
          AND privilege_type = 'UPDATE'`,
      [APP_ROLE]
    );
    const { rows: pol } = await client.query(
      `SELECT 1 FROM pg_policies WHERE tablename = 'analyses' AND policyname = ANY($1)`,
      [POLICIES.map((p) => p.nombre)]
    );
    if (grant.length === 0 || pol.length < POLICIES.length) {
      console.error("\nLa migración NO quedó completa: compartir va a seguir respondiendo 503.");
      process.exitCode = 1;
      return;
    }

    console.log("\n== Listo ==");
    console.log("Ninguna fila fue modificada. Ya se pueden compartir capturas, textos y preguntas.");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
