/**
 * Agrega el idioma del análisis a la tabla `analyses` (oct-2026).
 *
 * La web es bilingüe y ahora le pide a Gemini el análisis en el idioma de la persona
 * (`language` en el body de /analyze). La caché de /analyze reusa análisis por URL entre
 * usuarios, así que tiene que matchear por (url, language): si no, quien usa la web en
 * inglés recibe el análisis en castellano que pidió otra persona.
 *
 * ── Cómo correrlo ───────────────────────────────────────────────────────────────────
 * Con el DUEÑO de la tabla (en local, `postgres`), no con el rol del .env (`aletheia_app`),
 * que no puede hacer ALTER TABLE — es a propósito, ver migrate-rls.ts:
 *
 *   MIGRATION_DATABASE_URL=postgres://postgres:TU_PASSWORD@localhost:5432/aletheia \
 *     node node_modules/tsx/dist/cli.mjs migrate-language.ts
 *
 * (En Windows, `node node_modules/tsx/dist/cli.mjs` esquiva el bloqueo de `npx.ps1`.)
 * También se puede pegar el SQL de la sección "Idioma del análisis" de src/db/schema.sql
 * en pgAdmin, sobre la base `aletheia`.
 *
 * ── Qué pasa si no se corre ─────────────────────────────────────────────────────────
 * El código queda adelante del esquema: el INSERT de cada análisis falla con
 * `column "language" ... does not exist` (se loguea, pero el análisis NO se guarda y no
 * aparece en el historial) y la caché por URL deja de pegar. El historial existente se
 * sigue viendo, porque las lecturas no piden la columna.
 *
 * ── Qué hace ────────────────────────────────────────────────────────────────────────
 * Aditiva y re-corrible: agrega la columna con DEFAULT 'es' (todas las filas existentes
 * quedaron escritas en castellano, así que el default es el dato correcto), una CHECK y
 * un índice (url, language) para la caché. No reescribe ni borra ninguna fila.
 */
import "dotenv/config";
import pg from "pg";

const PASOS: Array<{ nombre: string; sql: string; ignorarSiExiste?: boolean }> = [
  {
    nombre: "columna language",
    sql: `ALTER TABLE analyses
            ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'es'`,
  },
  {
    nombre: "CHECK de language",
    // Postgres no tiene ADD CONSTRAINT IF NOT EXISTS: si ya está, el error es ignorable.
    ignorarSiExiste: true,
    sql: `ALTER TABLE analyses
            ADD CONSTRAINT analyses_language_chk CHECK (language IN ('es', 'en'))`,
  },
  {
    nombre: "índice (url, language) para la caché de /analyze",
    sql: `CREATE INDEX IF NOT EXISTS analyses_url_language_idx ON analyses (url, language)`,
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
    const { rows } = await client.query<{ usuario: string; base: string; dueño: string | null }>(
      `SELECT current_user AS usuario, current_database() AS base,
              (SELECT tableowner FROM pg_tables
                WHERE schemaname = 'public' AND tablename = 'analyses') AS "dueño"`
    );
    const { usuario, base, dueño } = rows[0];
    console.log(`Conectado como ${usuario} a la base ${base}`);

    // El error clásico es correrlo contra la base equivocada: que "salga bien" sin tocar nada.
    if (dueño === null) {
      console.error(`\nLa base ${base} no tiene la tabla analyses. ¿Es la base correcta?`);
      process.exitCode = 1;
      return;
    }
    if (dueño !== usuario) {
      console.error(
        `\n${usuario} no es dueño de analyses (dueño: ${dueño}), así que no puede alterarla.\n` +
          "Volvé a correrlo con el dueño, sin tocar el .env:\n\n" +
          `  MIGRATION_DATABASE_URL=postgres://${dueño}:TU_PASSWORD@localhost:5432/${base} \\\n` +
          "    node node_modules/tsx/dist/cli.mjs migrate-language.ts\n"
      );
      process.exitCode = 1;
      return;
    }

    for (const paso of PASOS) {
      try {
        await client.query(paso.sql);
        console.log(`  ok    ${paso.nombre}`);
      } catch (err) {
        // 42710 = duplicate_object (la constraint ya existía)
        if (paso.ignorarSiExiste && (err as { code?: string }).code === "42710") {
          console.log(`  ya estaba  ${paso.nombre}`);
          continue;
        }
        throw err;
      }
    }

    // Verificación real: volver a leer el esquema, no asumir que salió bien.
    const { rows: cols } = await client.query<{ column_default: string | null }>(
      `SELECT column_default FROM information_schema.columns
        WHERE table_name = 'analyses' AND column_name = 'language'`
    );
    console.log(
      cols.length > 0
        ? `\nColumna language presente (default ${cols[0].column_default}).`
        : "\nATENCION: la columna language no aparece en information_schema."
    );
    if (cols.length === 0) process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
