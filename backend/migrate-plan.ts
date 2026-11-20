/**
 * Plan pago: columnas de plan en `users`, contador de uso (`uso_analisis`) y constancias de baja.
 *
 * Premium se cobra con una suscripción de Mercado Pago. El plan Gratuito tiene un tope de
 * análisis por día y Premium uno de uso justo por mes. Hasta ahora el único límite era el de
 * ráfaga (20 por hora, en memoria): estos topes tienen que sobrevivir a un reinicio del
 * server, así que viven en Postgres.
 *
 * ── Cómo correrlo ───────────────────────────────────────────────────────────────────
 * Con el DUEÑO de las tablas (en local, `postgres`), no con el rol del .env
 * (`aletheia_app`), que no puede hacer ALTER TABLE — es a propósito, ver migrate-rls.ts:
 *
 *   MIGRATION_DATABASE_URL=postgres://postgres:TU_PASSWORD@localhost:5432/aletheia \
 *     node node_modules/tsx/dist/cli.mjs migrate-plan.ts
 *
 * (En Windows, `node node_modules/tsx/dist/cli.mjs` esquiva el bloqueo de `npx.ps1`.)
 *
 * ── Qué pasa si no se corre ─────────────────────────────────────────────────────────
 * Los análisis siguen andando, pero SIN tope por plan (el control de cupo deja pasar y
 * loguea `cupo.errorDb`), "Tu plan" responde 503 y el webhook de Mercado Pago no puede
 * pasar a nadie a Premium.
 *
 * ── Qué hace ────────────────────────────────────────────────────────────────────────
 * Aditiva y re-corrible: ADD COLUMN IF NOT EXISTS, CREATE TABLE IF NOT EXISTS, y las
 * policies y la CHECK se borran y se vuelven a crear. No reescribe ni borra ninguna fila:
 * todas las cuentas existentes quedan en 'gratuito'. Es la misma sección de schema.sql
 * ("Plan pago (Premium) y cupo de análisis").
 */
import "dotenv/config";
import pg from "pg";

const APP_ROLE = "aletheia_app";
const SOLO_USUARIO = `NULLIF(current_setting('app.current_user_id', true), '')::uuid`;

const PASOS: Array<{ nombre: string; sql: string }> = [
  {
    nombre: "columnas plan, plan_desde, plan_hasta y mp_preapproval_id en users",
    sql: `ALTER TABLE users
            ADD COLUMN IF NOT EXISTS plan              text NOT NULL DEFAULT 'gratuito',
            ADD COLUMN IF NOT EXISTS plan_desde        timestamptz,
            ADD COLUMN IF NOT EXISTS plan_hasta        timestamptz,
            ADD COLUMN IF NOT EXISTS mp_preapproval_id text`,
  },
  {
    nombre: "CHECK de los valores de plan",
    sql: `ALTER TABLE users DROP CONSTRAINT IF EXISTS users_plan_chk;
          ALTER TABLE users ADD CONSTRAINT users_plan_chk CHECK (plan IN ('gratuito', 'premium'))`,
  },
  {
    nombre: "tabla uso_analisis",
    sql: `CREATE TABLE IF NOT EXISTS uso_analisis (
            user_id  uuid    NOT NULL REFERENCES users (id) ON DELETE CASCADE,
            ventana  text    NOT NULL CHECK (ventana IN ('dia', 'mes')),
            periodo  date    NOT NULL,
            analisis integer NOT NULL DEFAULT 0 CHECK (analisis >= 0),
            PRIMARY KEY (user_id, ventana, periodo)
          )`,
  },
  {
    nombre: "tabla solicitudes_plan",
    sql: `CREATE TABLE IF NOT EXISTS solicitudes_plan (
            id                uuid PRIMARY KEY,
            user_id           uuid,
            email             text,
            tipo              text NOT NULL CHECK (tipo IN ('baja', 'arrepentimiento')),
            estado            text NOT NULL CHECK (estado IN ('resuelta', 'pendiente')),
            mp_preapproval_id text,
            detalle           text,
            created_at        timestamptz NOT NULL DEFAULT now()
          )`,
  },
  {
    nombre: `permisos de ${APP_ROLE} sobre las tablas nuevas`,
    sql: `GRANT SELECT, INSERT, UPDATE, DELETE ON public.uso_analisis TO ${APP_ROLE};
          GRANT SELECT, INSERT ON public.solicitudes_plan TO ${APP_ROLE}`,
  },
  {
    nombre: "Row Level Security en las tablas nuevas",
    sql: `ALTER TABLE uso_analisis ENABLE ROW LEVEL SECURITY;
          ALTER TABLE solicitudes_plan ENABLE ROW LEVEL SECURITY`,
  },
  {
    nombre: "policies de uso_analisis (cada quien, su contador)",
    sql: `DROP POLICY IF EXISTS uso_analisis_select_own ON uso_analisis;
          CREATE POLICY uso_analisis_select_own ON uso_analisis
            FOR SELECT USING (user_id = ${SOLO_USUARIO});
          DROP POLICY IF EXISTS uso_analisis_insert_own ON uso_analisis;
          CREATE POLICY uso_analisis_insert_own ON uso_analisis
            FOR INSERT WITH CHECK (user_id = ${SOLO_USUARIO});
          DROP POLICY IF EXISTS uso_analisis_update_own ON uso_analisis;
          CREATE POLICY uso_analisis_update_own ON uso_analisis
            FOR UPDATE USING (user_id = ${SOLO_USUARIO}) WITH CHECK (user_id = ${SOLO_USUARIO});
          DROP POLICY IF EXISTS uso_analisis_delete_own ON uso_analisis;
          CREATE POLICY uso_analisis_delete_own ON uso_analisis
            FOR DELETE USING (user_id = ${SOLO_USUARIO})`,
  },
  {
    nombre: "policies de solicitudes_plan (leer propias, crear propias o anónimas)",
    sql: `DROP POLICY IF EXISTS solicitudes_plan_select_own ON solicitudes_plan;
          CREATE POLICY solicitudes_plan_select_own ON solicitudes_plan
            FOR SELECT USING (user_id = ${SOLO_USUARIO});
          DROP POLICY IF EXISTS solicitudes_plan_insert ON solicitudes_plan;
          CREATE POLICY solicitudes_plan_insert ON solicitudes_plan
            FOR INSERT WITH CHECK (user_id IS NULL OR user_id = ${SOLO_USUARIO})`,
  },
];

async function main() {
  const connectionString = process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("Falta MIGRATION_DATABASE_URL (o DATABASE_URL). Ver el comentario de arriba.");
    process.exit(1);
  }

  const client = new pg.Client({ connectionString });
  await client.connect();

  try {
    const { rows } = await client.query<{
      usuario: string;
      base: string;
      dueño: string | null;
      hayRol: boolean;
    }>(
      `SELECT current_user AS usuario, current_database() AS base,
              (SELECT tableowner FROM pg_tables
                WHERE schemaname = 'public' AND tablename = 'users') AS "dueño",
              EXISTS (SELECT 1 FROM pg_roles WHERE rolname = $1) AS "hayRol"`,
      [APP_ROLE]
    );
    const { usuario, base, dueño, hayRol } = rows[0];
    console.log(`Conectado como ${usuario} a la base ${base}`);

    // El error clásico es correrlo contra la base equivocada: que "salga bien" sin tocar nada.
    if (dueño === null) {
      console.error(`\nLa base ${base} no tiene la tabla users. ¿Es la base correcta?`);
      process.exitCode = 1;
      return;
    }
    if (dueño !== usuario) {
      console.error(
        `\n${usuario} no es dueño de users (dueño: ${dueño}), así que no puede alterarla.\n` +
          "Volvé a correrlo con el dueño, sin tocar el .env:\n\n" +
          `  MIGRATION_DATABASE_URL=postgres://${dueño}:TU_PASSWORD@localhost:5432/${base} \\\n` +
          "    node node_modules/tsx/dist/cli.mjs migrate-plan.ts\n"
      );
      process.exitCode = 1;
      return;
    }
    if (!hayRol) {
      console.error(`\nNo existe el rol ${APP_ROLE}. Corré primero migrate-rls.ts.`);
      process.exitCode = 1;
      return;
    }

    // Todo o nada: si un paso falla, no queda la tabla creada sin sus policies.
    await client.query("BEGIN");
    try {
      for (const paso of PASOS) {
        await client.query(paso.sql);
        console.log(`  ok    ${paso.nombre}`);
      }
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    }

    // Verificación real: leer lo que quedó en la base, no asumir que salió bien.
    const { rows: columnas } = await client.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'users'
          AND column_name IN ('plan', 'plan_desde', 'plan_hasta', 'mp_preapproval_id')`
    );
    const { rows: policies } = await client.query<{ tablename: string; policyname: string }>(
      `SELECT tablename, policyname FROM pg_policies
        WHERE tablename IN ('uso_analisis', 'solicitudes_plan') ORDER BY 1, 2`
    );
    const { rows: permisos } = await client.query<{ tabla: string; puede: boolean }>(
      `SELECT t AS tabla, has_table_privilege($1, 'public.' || t, 'INSERT') AS puede
         FROM unnest(ARRAY['uso_analisis', 'solicitudes_plan']) AS t`,
      [APP_ROLE]
    );

    const faltanPermisos = permisos.filter((p) => !p.puede).map((p) => p.tabla);
    if (columnas.length !== 4 || policies.length !== 6 || faltanPermisos.length > 0) {
      console.error(
        `\nATENCION: el esquema no quedó completo (columnas ${columnas.length}/4, ` +
          `policies ${policies.length}/6` +
          (faltanPermisos.length > 0 ? `, sin INSERT para ${APP_ROLE} en ${faltanPermisos.join(", ")}` : "") +
          "). Revisá la base."
      );
      process.exitCode = 1;
      return;
    }

    console.log(`\nListo: ${columnas.length} columnas en users y ${policies.length} policies:`);
    for (const p of policies) console.log(`  ${p.tablename}.${p.policyname}`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
