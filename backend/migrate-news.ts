/**
 * Habilita "Novedades del producto": agrega `users.news_opt_in` (false por defecto).
 *
 * La preferencia se cambia desde Configuración (PUT /me/preferences) y la usa
 * send-news.ts para saber a quién mandarle una novedad. El UPDATE de `users` ya lo tiene
 * el rol de la app, con la policy users_update_own (ver migrate-rls.ts): no hacen falta
 * permisos nuevos.
 *
 * Con el DUEÑO de las tablas, igual que las otras migraciones:
 *
 *   read -s -p "password de postgres: " PGPASSWORD && echo && \
 *     PGUSER=postgres PGPASSWORD="$PGPASSWORD" npx tsx migrate-news.ts; unset PGPASSWORD
 *
 * Re-corrible y no cambia ninguna preferencia: todas las cuentas quedan sin novedades
 * hasta que cada persona las active. Sin correrlo, GET /me sigue andando (newsOptIn
 * false) y activar el switch responde 503.
 */
import "dotenv/config";
import pg from "pg";

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
      `SELECT tableowner AS "dueño" FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users'`
    );
    if (tabla.length === 0) {
      console.error("\nNo encuentro la tabla users en este esquema. ¿Es la base correcta?");
      process.exitCode = 1;
      return;
    }
    if (tabla[0].dueño !== yo[0].usuario) {
      console.error(
        `\nEste rol no es dueño de users (dueño: ${tabla[0].dueño}). Volvé a correrlo así:\n\n` +
          `  read -s -p "password de ${tabla[0].dueño}: " PGPASSWORD && echo && \\\n` +
          `    PGUSER=${tabla[0].dueño} PGPASSWORD="$PGPASSWORD" npx tsx migrate-news.ts; unset PGPASSWORD\n`
      );
      process.exitCode = 1;
      return;
    }

    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS news_opt_in boolean NOT NULL DEFAULT false`);
    console.log("  ok    users.news_opt_in");

    const { rows } = await client.query<{ total: string; activos: string }>(
      `SELECT count(*) AS total, count(*) FILTER (WHERE news_opt_in) AS activos FROM users`
    );
    console.log(`\nListo. ${rows[0].activos} de ${rows[0].total} cuentas tienen las novedades activadas.`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
