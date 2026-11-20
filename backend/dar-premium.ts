/**
 * Da Premium a mano a una o más cuentas, sin pasar por Mercado Pago (cuentas del equipo,
 * demos en la expo). También lo saca.
 *
 * ── Cómo correrlo ───────────────────────────────────────────────────────────────────
 * Desde backend/, con el DUEÑO de las tablas (en local, `postgres`): el rol del .env
 * (`aletheia_app`) no puede cambiarle el plan a nadie, a propósito.
 *
 *   node node_modules/tsx/dist/cli.mjs dar-premium.ts renzo@... ciro@...
 *   node node_modules/tsx/dist/cli.mjs dar-premium.ts --hasta 2026-12-31 renzo@...
 *   node node_modules/tsx/dist/cli.mjs dar-premium.ts --quitar renzo@...
 *
 * Si no hay MIGRATION_DATABASE_URL, pide la contraseña de `postgres` (sin mostrarla) y se
 * conecta a localhost:5432/aletheia. Si faltan los emails, los pide.
 *
 * ── Qué hace ────────────────────────────────────────────────────────────────────────
 * 1. Si la base no tiene las columnas del plan, corre migrate-plan.ts primero.
 * 2. Pone plan='premium' hasta la fecha de --hasta (default: 10-dic-2026, después de la
 *    expo). Ese día la cuenta vuelve sola a Gratuito. Sin suscripción de Mercado Pago
 *    asociada, ningún aviso de Mercado Pago la puede bajar antes.
 * 3. Muestra cómo quedó cada cuenta y avisa qué emails no existen todavía (la fila se crea
 *    la primera vez que la cuenta entra a la app: entrar una vez y volver a correrlo).
 */
import "dotenv/config";
import { spawnSync } from "node:child_process";
import path from "node:path";
import readline from "node:readline";
import pg from "pg";

const HASTA_POR_DEFECTO = "2026-12-10";

function preguntar(texto: string, oculto = false): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  if (oculto) {
    // Escribe la pregunta, pero no el eco de lo que se tipea.
    const salida = rl as unknown as { _writeToOutput: (s: string) => void };
    let mostrada = false;
    salida._writeToOutput = (s: string) => {
      if (!mostrada) {
        process.stdout.write(s);
        mostrada = true;
      }
    };
  }
  return new Promise((resolve) =>
    rl.question(texto, (respuesta) => {
      rl.close();
      if (oculto) process.stdout.write("\n");
      resolve(respuesta.trim());
    })
  );
}

function leerArgumentos() {
  const args = process.argv.slice(2);
  let hasta = HASTA_POR_DEFECTO;
  let quitar = false;
  const emails: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--hasta") hasta = args[++i] ?? hasta;
    else if (args[i] === "--quitar") quitar = true;
    else emails.push(args[i]);
  }
  return { hasta, quitar, emails };
}

async function main() {
  let { hasta, quitar, emails } = leerArgumentos();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(hasta)) {
    console.error(`--hasta tiene que ser una fecha AAAA-MM-DD (llegó "${hasta}").`);
    process.exit(1);
  }

  let connectionString = process.env.MIGRATION_DATABASE_URL;
  if (!connectionString) {
    const password = await preguntar("Contraseña de postgres (local): ", true);
    connectionString = `postgres://postgres:${encodeURIComponent(password)}@localhost:5432/aletheia`;
  }

  if (emails.length === 0) {
    const respuesta = await preguntar("Emails de las cuentas, separados por coma: ");
    emails = respuesta.split(",");
  }
  emails = emails.map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (emails.length === 0) {
    console.error("No llegó ningún email.");
    process.exit(1);
  }

  const client = new pg.Client({ connectionString });
  await client.connect();

  try {
    const { rows: base } = await client.query<{ usuario: string; base: string; columnas: number }>(
      `SELECT current_user AS usuario, current_database() AS base,
              (SELECT count(*)::int FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = 'users'
                  AND column_name IN ('plan', 'plan_desde', 'plan_hasta')) AS columnas`
    );
    console.log(`Conectado como ${base[0].usuario} a la base ${base[0].base}`);

    if (base[0].columnas < 3) {
      console.log("La base no tiene el plan todavía: corro migrate-plan.ts primero.\n");
      const migracion = spawnSync(
        process.execPath,
        // Rutas desde la carpeta del script: anda aunque se lo llame desde otra carpeta.
        [path.join(__dirname, "node_modules/tsx/dist/cli.mjs"), path.join(__dirname, "migrate-plan.ts")],
        {
          stdio: "inherit",
          cwd: __dirname,
          env: { ...process.env, MIGRATION_DATABASE_URL: connectionString },
        }
      );
      if (migracion.status !== 0) {
        console.error("\nLa migración falló: no toqué ninguna cuenta.");
        process.exitCode = 1;
        return;
      }
      console.log("");
    }

    const { rows } = quitar
      ? await client.query<{ email: string; plan: string; plan_hasta: Date | null }>(
          `UPDATE users SET plan = 'gratuito', plan_desde = NULL, plan_hasta = NULL
            WHERE lower(email) = ANY($1) RETURNING email, plan, plan_hasta`,
          [emails]
        )
      : await client.query<{ email: string; plan: string; plan_hasta: Date | null }>(
          `UPDATE users
              SET plan = 'premium',
                  plan_desde = COALESCE(plan_desde, now()),
                  plan_hasta = ($2::date + interval '1 day' - interval '1 second')
                               AT TIME ZONE 'America/Argentina/Buenos_Aires'
            WHERE lower(email) = ANY($1) RETURNING email, plan, plan_hasta`,
          [emails, hasta]
        );

    for (const fila of rows) {
      const hastaTexto = fila.plan_hasta
        ? ` hasta el ${fila.plan_hasta.toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", hourCycle: "h23" })}`
        : "";
      console.log(`  ok    ${fila.email}: ${fila.plan}${hastaTexto}`);
    }

    const encontrados = new Set(rows.map((f) => f.email.toLowerCase()));
    const faltan = emails.filter((e) => !encontrados.has(e));
    for (const email of faltan) {
      console.log(
        `  falta ${email}: esa cuenta todavía no entró nunca a la app (o el email está mal). ` +
          "Que entre una vez y volvé a correr esto."
      );
    }
    if (faltan.length > 0) process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
