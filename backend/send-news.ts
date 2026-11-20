/**
 * Manda una novedad del producto por email a todas las cuentas que activaron "Novedades
 * del producto" en Configuración (users.news_opt_in, ver migrate-news.ts).
 *
 * ── Uso ─────────────────────────────────────────────────────────────────────────────
 * 1. Escribir la novedad en un archivo de texto. Los párrafos se separan con una línea en
 *    blanco; una línea que es solo una URL se convierte en botón.
 * 2. Probarla mandándotela a vos:
 *
 *      npx tsx send-news.ts --asunto "Novedad: ..." --archivo novedad.txt --prueba vos@mail.com
 *
 * 3. Ver a cuántas personas les llegaría (no manda nada):
 *
 *      npx tsx send-news.ts --asunto "Novedad: ..." --archivo novedad.txt
 *
 * 4. Mandarla de verdad, agregando --enviar.
 *
 * Usa el SMTP del .env (SMTP_HOST, SMTP_USER, SMTP_PASS, MAIL_FROM) y se conecta a la base
 * con el DUEÑO de las tablas, como las migraciones: con el rol de la app, Row Level
 * Security solo dejaría ver la fila de un usuario. Ejemplo:
 *
 *   read -s -p "password de postgres: " PGPASSWORD && echo && \
 *     PGUSER=postgres PGPASSWORD="$PGPASSWORD" npx tsx send-news.ts --asunto ... --archivo ...
 *
 * Gmail limita a ~500 mails por día desde una cuenta común: con más suscriptos conviene un
 * SMTP transaccional (Resend, Brevo, SES).
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import pg from "pg";
import { enviarMail, escaparHtml, mailConfigurado, plantillaHtml } from "./src/mail/mailer.js";

const URL_CONFIGURACION = "https://aletheiainc.online/configuracion";
/** Pausa entre mails, para no disparar los límites por minuto del SMTP. */
const PAUSA_MS = 400;

function argumento(nombre: string): string | null {
  const i = process.argv.indexOf(`--${nombre}`);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[i + 1] : null;
}

function armarMail(asunto: string, cuerpo: string) {
  const parrafos = cuerpo
    .split(/\r?\n\s*\r?\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const html = parrafos
    .map((p) =>
      /^https?:\/\/\S+$/.test(p)
        ? `<p style="margin:24px 0;"><a href="${escaparHtml(p)}" style="display:inline-block;padding:12px 22px;border-radius:999px;background:#7a5af8;color:#ffffff;font-weight:600;text-decoration:none;">Ver en AletheIA</a></p>`
        : `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#3d4240;">${escaparHtml(p).replace(/\r?\n/g, "<br>")}</p>`
    )
    .join("\n");

  const pie =
    "Te llega porque activaste «Novedades del producto». Podés desactivarlo en " +
    `<a href="${URL_CONFIGURACION}" style="color:#6b6f6c;">Configuración</a>.`;

  return {
    subject: asunto,
    text: `${parrafos.join("\n\n")}\n\n—\nTe llega porque activaste «Novedades del producto». Desactivalo en ${URL_CONFIGURACION}`,
    html: plantillaHtml(`<h1 style="margin:0 0 16px;font-size:22px;color:#0b100f;">${escaparHtml(asunto)}</h1>\n${html}`, pie),
  };
}

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
  const asunto = argumento("asunto");
  const archivo = argumento("archivo");
  const prueba = argumento("prueba");
  const enviar = process.argv.includes("--enviar");

  if (!asunto || !archivo) {
    console.error('Uso: npx tsx send-news.ts --asunto "..." --archivo novedad.txt [--prueba vos@mail.com | --enviar]');
    process.exit(1);
  }
  if (!mailConfigurado()) {
    console.error("Faltan SMTP_HOST, SMTP_USER y SMTP_PASS en el .env.");
    process.exit(1);
  }

  const mail = armarMail(asunto, readFileSync(archivo, "utf8"));

  if (prueba) {
    await enviarMail({ to: prueba, ...mail });
    console.log(`Prueba enviada a ${prueba}. No se mandó nada a nadie más.`);
    return;
  }

  const client = crearCliente();
  await client.connect();
  let destinatarios: string[];
  try {
    const { rows } = await client.query<{ email: string }>(
      `SELECT DISTINCT lower(email) AS email FROM users WHERE news_opt_in AND email IS NOT NULL ORDER BY 1`
    );
    destinatarios = rows.map((r) => r.email);
  } finally {
    await client.end();
  }

  console.log(`Asunto: ${asunto}`);
  console.log(`Destinatarios: ${destinatarios.length}`);
  if (!enviar) {
    console.log("\nNo se mandó nada. Para enviarla de verdad, repetí el comando con --enviar.");
    return;
  }

  let ok = 0;
  const fallidos: string[] = [];
  for (const to of destinatarios) {
    try {
      await enviarMail({ to, ...mail });
      ok += 1;
    } catch (err) {
      fallidos.push(`${to}: ${err instanceof Error ? err.message : String(err)}`);
    }
    await new Promise((r) => setTimeout(r, PAUSA_MS));
  }

  console.log(`\nEnviados: ${ok} de ${destinatarios.length}.`);
  if (fallidos.length > 0) {
    console.log("Fallaron:");
    for (const f of fallidos) console.log(`  ${f}`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
