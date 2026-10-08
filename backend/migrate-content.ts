/**
 * Corre la migración de "contenido que el scraper no puede ver" sobre la DB que
 * apunte DATABASE_URL. Correr con: npx tsx migrate-content.ts
 *
 * POST /analyze/content analiza evidencia que arma la extensión dentro de la pestaña
 * de la persona (captura, selección, texto pegado), no una URL pública. Ese contenido
 * puede ser privado, así que nunca puede salir por los caminos que comparten análisis
 * entre usuarios: el link público de "Compartir resultado", la caché por URL de
 * /analyze, y el agregado de /stats.
 *
 * Es aditiva y re-corrible: agrega dos columnas (todas las filas viejas quedan
 * 'url'), suma una CHECK, y recrea la policy de SELECT. No borra ni reescribe
 * ninguna fila.
 *
 * El paso 3 es el que protege de verdad: sin él, las columnas del paso 1 no sirven
 * de nada. Por eso el orden importa — la policy referencia `source_type`.
 */
import "dotenv/config";
import { getPool } from "./src/db/pool.js";

const PASOS: Array<{ nombre: string; sql: string; ignorarSiExiste?: boolean }> = [
  {
    nombre: "columnas source_type/capture_platform",
    sql: `ALTER TABLE analyses
            ADD COLUMN IF NOT EXISTS source_type      text NOT NULL DEFAULT 'url',
            ADD COLUMN IF NOT EXISTS capture_platform text`,
  },
  {
    nombre: "CHECK de source_type",
    // Postgres no tiene ADD CONSTRAINT IF NOT EXISTS: si ya está, el error es ignorable.
    ignorarSiExiste: true,
    sql: `ALTER TABLE analyses
            ADD CONSTRAINT analyses_source_type_chk
            CHECK (source_type IN ('url', 'capture', 'selection', 'image', 'text'))`,
  },
  {
    nombre: "baja la policy vieja de SELECT",
    sql: `DROP POLICY IF EXISTS analyses_select_own_or_shared ON analyses`,
  },
  {
    nombre: "policy de SELECT: el bypass solo alcanza a filas 'url'",
    sql: `CREATE POLICY analyses_select_own_or_shared ON analyses
            FOR SELECT
            USING (
              user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
              OR (
                current_setting('app.bypass_owner_check', true) = 'true'
                AND source_type = 'url'
              )
            )`,
  },
];

async function main() {
  const pool = await getPool();

  for (const paso of PASOS) {
    try {
      await pool.query(paso.sql);
      console.log(`  ok    ${paso.nombre}`);
    } catch (err) {
      const code = (err as { code?: string }).code;
      // 42710 = duplicate_object (la constraint ya existía)
      if (paso.ignorarSiExiste && code === "42710") {
        console.log(`  ya estaba  ${paso.nombre}`);
        continue;
      }
      console.error(`  FALLA ${paso.nombre}:`, err instanceof Error ? err.message : err);
      throw err;
    }
  }

  const cols = await pool.query<{ column_name: string }>(
    `SELECT column_name FROM information_schema.columns
     WHERE table_name = 'analyses'
       AND column_name IN ('source_type','capture_platform')`
  );
  console.log(`\nColumnas nuevas presentes: ${cols.rows.map((c) => c.column_name).sort().join(", ")}`);

  // El chequeo que importa: la policy nueva tiene que mencionar source_type.
  const pol = await pool.query<{ qual: string }>(
    `SELECT qual FROM pg_policies
      WHERE tablename = 'analyses' AND policyname = 'analyses_select_own_or_shared'`
  );
  const protegida = pol.rows[0]?.qual?.includes("source_type") ?? false;
  console.log(
    protegida
      ? "Policy de SELECT: ok — el bypass quedó restringido a source_type = 'url'."
      : "Policy de SELECT: ATENCION — no menciona source_type, el contenido privado sigue expuesto."
  );

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
