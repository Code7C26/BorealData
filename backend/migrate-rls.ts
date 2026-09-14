/**
 * Activa Row Level Security en `users`/`analyses` sobre la DB que apunte DATABASE_URL:
 * crea el rol de aplicación `aletheia_app` (sin ser dueño de las tablas, permisos
 * mínimos), prende RLS, y crea las policies (cada usuario ve/escribe solo lo suyo,
 * con las excepciones a propósito para "Compartir resultado", la caché de /analyze
 * por URL, y el agregado público de /stats — ver schema.sql para el detalle).
 *
 * Es re-corrible: las policies se recrean (DROP IF EXISTS + CREATE), el rol se crea
 * si no existe o se actualiza si ya estaba. No borra ni toca ninguna fila de datos.
 *
 * Correr con: npx tsx migrate-rls.ts
 *
 * OJO: esto NO activa el uso del rol nuevo todavía. El backend sigue conectándose con
 * el usuario de siempre (dueño de las tablas, que Postgres deja pasar sin chequear las
 * policies) hasta que se actualice DATABASE_URL/DB_USER en el .env — eso es un paso
 * aparte, después de confirmar que este script corrió bien.
 */
import "dotenv/config";
import crypto from "node:crypto";
import { getPool } from "./src/db/pool.js";

const APP_ROLE = "aletheia_app";
const APP_PASSWORD = crypto.randomBytes(24).toString("base64url");

async function main() {
  const pool = await getPool();

  console.log("== Estado actual ==");
  const tables = await pool.query<{ tablename: string }>(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`
  );
  console.log("Tablas:", tables.rows.map((r) => r.tablename).join(", "));

  const userCount = await pool.query(`SELECT COUNT(*) FROM users`);
  const analysesCount = await pool.query(`SELECT COUNT(*) FROM analyses`);
  console.log(`Filas: users=${userCount.rows[0].count} analyses=${analysesCount.rows[0].count}`);

  console.log("\n== Creando rol de aplicación ==");
  try {
    await pool.query(`CREATE ROLE ${APP_ROLE} WITH LOGIN PASSWORD '${APP_PASSWORD}'`);
    console.log(`  ok    rol ${APP_ROLE} creado`);
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === "42710") {
      // 42710 = duplicate_object (el rol ya existía) - le reseteamos la password igual,
      // para que el valor que este script imprime al final sea siempre el vigente.
      await pool.query(`ALTER ROLE ${APP_ROLE} WITH LOGIN PASSWORD '${APP_PASSWORD}'`);
      console.log(`  ya estaba  rol ${APP_ROLE} (password actualizada)`);
    } else {
      throw err;
    }
  }

  await pool.query(`GRANT USAGE ON SCHEMA public TO ${APP_ROLE}`);
  await pool.query(`GRANT SELECT, INSERT, UPDATE ON public.analyses, public.users TO ${APP_ROLE}`);
  console.log("  ok    permisos (SELECT/INSERT/UPDATE, sin DELETE ni DDL)");

  console.log("\n== Activando Row Level Security ==");
  await pool.query(`ALTER TABLE users ENABLE ROW LEVEL SECURITY`);
  await pool.query(`ALTER TABLE analyses ENABLE ROW LEVEL SECURITY`);
  console.log("  ok    RLS activado en users y analyses");

  console.log("\n== Creando policies ==");
  const policies: Array<{ nombre: string; sql: string }> = [
    {
      nombre: "users_select_own",
      sql: `CREATE POLICY users_select_own ON users
              FOR SELECT
              USING (firebase_uid = current_setting('app.current_firebase_uid', true))`,
    },
    {
      nombre: "users_insert_own",
      sql: `CREATE POLICY users_insert_own ON users
              FOR INSERT
              WITH CHECK (firebase_uid = current_setting('app.current_firebase_uid', true))`,
    },
    {
      nombre: "users_update_own",
      sql: `CREATE POLICY users_update_own ON users
              FOR UPDATE
              USING (firebase_uid = current_setting('app.current_firebase_uid', true))
              WITH CHECK (firebase_uid = current_setting('app.current_firebase_uid', true))`,
    },
    {
      nombre: "analyses_select_own_or_shared",
      sql: `CREATE POLICY analyses_select_own_or_shared ON analyses
              FOR SELECT
              USING (
                user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
                OR current_setting('app.bypass_owner_check', true) = 'true'
              )`,
    },
    {
      nombre: "analyses_insert_own",
      sql: `CREATE POLICY analyses_insert_own ON analyses
              FOR INSERT
              WITH CHECK (
                user_id IS NULL
                OR user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
              )`,
    },
  ];

  for (const policy of policies) {
    const table = policy.nombre.startsWith("users") ? "users" : "analyses";
    await pool.query(`DROP POLICY IF EXISTS ${policy.nombre} ON ${table}`);
    await pool.query(policy.sql);
    console.log(`  ok    ${policy.nombre}`);
  }

  console.log("\n== Verificación ==");
  const rls = await pool.query<{ relname: string; relrowsecurity: boolean }>(
    `SELECT relname, relrowsecurity FROM pg_class WHERE relname IN ('users', 'analyses')`
  );
  console.log("RLS activado:", rls.rows);

  const pol = await pool.query<{ tablename: string; policyname: string }>(
    `SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname`
  );
  console.log("Policies creadas:", pol.rows.map((r) => `${r.tablename}.${r.policyname}`).join(", "));

  console.log("\n== Listo ==");
  console.log(`Rol de aplicación: ${APP_ROLE}`);
  console.log(`Password nueva:    ${APP_PASSWORD}`);
  console.log(
    "\nEl backend TODAVÍA sigue conectado con el usuario de siempre — nada cambió en cómo" +
      " corre la app hasta que se actualice el .env a propósito."
  );

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
