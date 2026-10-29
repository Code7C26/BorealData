/**
 * Habilita el tipo de origen `question` en la tabla `analyses` (oct-2026).
 *
 * La app y la web ahora dejan preguntar una duda con palabras propias — "¿es verdad
 * que…?", "escuché que…" — en vez de pegar solamente el texto de una noticia. Ese análisis
 * se guarda con `source_type = 'question'`, y la CHECK que existe hoy solo admite
 * ('url', 'capture', 'selection', 'image', 'text').
 *
 * ── Cómo correrlo ───────────────────────────────────────────────────────────────────
 * Con el DUEÑO de la tabla (en local, `postgres`), no con el rol del .env (`aletheia_app`),
 * que no puede hacer ALTER TABLE — es a propósito, ver migrate-rls.ts:
 *
 *   MIGRATION_DATABASE_URL=postgres://postgres:TU_PASSWORD@localhost:5432/aletheia \
 *     node node_modules/tsx/dist/cli.mjs migrate-question.ts
 *
 * (En Windows, `node node_modules/tsx/dist/cli.mjs` esquiva el bloqueo de `npx.ps1`.)
 *
 * ── Qué pasa si no se corre ─────────────────────────────────────────────────────────
 * El análisis se hace igual y la persona ve el veredicto, pero el INSERT falla con
 * `new row ... violates check constraint "analyses_source_type_chk"`: no se guarda y no
 * aparece en el historial. Falla solo en las preguntas; el resto sigue funcionando.
 *
 * ── Qué hace ────────────────────────────────────────────────────────────────────────
 * Aditiva y re-corrible: reemplaza la CHECK por la misma lista más 'question'. No
 * reescribe ni borra ninguna fila, y las que ya existen siguen siendo válidas.
 */
import "dotenv/config";
import pg from "pg";

/** Los valores que la columna va a aceptar. Espejo de `SourceType` en analysesRepository.ts. */
const VALORES = ["url", "capture", "selection", "image", "text", "question"] as const;
const LISTA_SQL = VALORES.map((v) => `'${v}'`).join(", ");

const PASOS: Array<{ nombre: string; sql: string }> = [
  {
    // Se borra y se vuelve a crear: Postgres no sabe modificar una CHECK en el lugar, y
    // DROP ... IF EXISTS hace que el paso sea re-corrible sin error.
    nombre: "sacar la CHECK vieja de source_type",
    sql: `ALTER TABLE analyses DROP CONSTRAINT IF EXISTS analyses_source_type_chk`,
  },
  {
    nombre: "crear la CHECK con 'question' incluido",
    sql: `ALTER TABLE analyses
            ADD CONSTRAINT analyses_source_type_chk
            CHECK (source_type IN (${LISTA_SQL}))`,
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
          "    node node_modules/tsx/dist/cli.mjs migrate-question.ts\n"
      );
      process.exitCode = 1;
      return;
    }

    for (const paso of PASOS) {
      await client.query(paso.sql);
      console.log(`  ok    ${paso.nombre}`);
    }

    // Verificación real: leer la definición que quedó en la base, no asumir que salió bien.
    const { rows: chk } = await client.query<{ definicion: string }>(
      `SELECT pg_get_constraintdef(oid) AS definicion
         FROM pg_constraint
        WHERE conname = 'analyses_source_type_chk'`
    );
    if (chk.length === 0 || !chk[0].definicion.includes("question")) {
      console.error("\nATENCION: la CHECK no quedó con 'question'. Revisá la base.");
      process.exitCode = 1;
      return;
    }
    console.log(`\nCHECK actualizada: ${chk[0].definicion}`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
