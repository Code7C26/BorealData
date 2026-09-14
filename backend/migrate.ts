/**
 * Corre la migración del rediseño V1 (veredicto + confianza) sobre la DB que
 * apunte DATABASE_URL. Correr con: npx tsx migrate.ts
 *
 * Es aditiva y re-corrible: agrega columnas, afloja dos NOT NULL y suma una
 * CHECK. No borra ni reescribe ninguna fila — las anteriores al rediseño se
 * traducen al leerlas (ver analysesRepository.ts::mapAnalysisRow).
 */
import "dotenv/config";
import { getPool } from "./src/db/pool.js";

const PASOS: Array<{ nombre: string; sql: string; ignorarSiExiste?: boolean }> = [
  {
    nombre: "columnas verdict/confidence/headline/lead_text/reasoning",
    sql: `ALTER TABLE analyses
            ADD COLUMN IF NOT EXISTS verdict    text,
            ADD COLUMN IF NOT EXISTS confidence smallint,
            ADD COLUMN IF NOT EXISTS headline   text,
            ADD COLUMN IF NOT EXISTS lead_text  text,
            ADD COLUMN IF NOT EXISTS reasoning  jsonb NOT NULL DEFAULT '[]'`,
  },
  { nombre: "score deja de ser NOT NULL", sql: `ALTER TABLE analyses ALTER COLUMN score DROP NOT NULL` },
  { nombre: "label deja de ser NOT NULL", sql: `ALTER TABLE analyses ALTER COLUMN label DROP NOT NULL` },
  {
    nombre: "CHECK de combinaciones válidas",
    // Postgres no tiene ADD CONSTRAINT IF NOT EXISTS: si ya está, el error es ignorable.
    ignorarSiExiste: true,
    sql: `ALTER TABLE analyses
            ADD CONSTRAINT analyses_verdict_confidence_chk CHECK (
              verdict IS NULL
              OR (verdict = 'verificado' AND confidence BETWEEN 3 AND 5)
              OR (verdict = 'falso'      AND confidence BETWEEN 3 AND 5)
              OR (verdict = 'dudoso'     AND confidence BETWEEN 2 AND 4)
              OR (verdict = 'sin-datos'  AND confidence BETWEEN 1 AND 2)
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
       AND column_name IN ('verdict','confidence','headline','lead_text','reasoning')`
  );
  console.log(`\nColumnas nuevas presentes: ${cols.rows.map((c) => c.column_name).sort().join(", ")}`);

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
