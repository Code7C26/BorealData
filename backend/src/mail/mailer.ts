import nodemailer, { type Transporter } from "nodemailer";

/**
 * Envío de emails por SMTP: el código para recuperar la contraseña y las novedades del
 * producto (ver scripts/send-news.ts).
 *
 * Variables de entorno:
 *   SMTP_HOST   ej. smtp.gmail.com
 *   SMTP_PORT   465 (TLS directo, default) o 587 (STARTTLS)
 *   SMTP_USER   la cuenta que envía
 *   SMTP_PASS   su contraseña. En Gmail tiene que ser una "contraseña de aplicación"
 *               (Cuenta de Google → Seguridad → Verificación en 2 pasos → Contraseñas de
 *               aplicaciones), no la contraseña normal.
 *   MAIL_FROM   opcional, ej. "AletheIA <soporte@aletheiainc.online>". Default: SMTP_USER.
 *               Con Gmail, el remitente tiene que ser la misma cuenta (o un alias suyo).
 */

let transporter: Transporter | null = null;

export class MailNoConfigurado extends Error {
  constructor() {
    super("Faltan SMTP_HOST, SMTP_USER y SMTP_PASS: el backend no puede enviar emails.");
  }
}

export function mailConfigurado(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function getTransporter(): Transporter {
  if (transporter) return transporter;
  if (!mailConfigurado()) throw new MailNoConfigurado();

  const port = Number(process.env.SMTP_PORT) || 465;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return transporter;
}

export interface Mail {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export async function enviarMail(mail: Mail): Promise<void> {
  await getTransporter().sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    ...mail,
  });
}

/** Escapa texto para meterlo en el HTML de un mail. */
export function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * El marco común de los mails: fondo claro (muchos clientes de mail ignoran el modo
 * oscuro), el nombre de la marca arriba y una nota al pie. Todo con estilos inline,
 * que es lo único que respetan Gmail y Outlook.
 */
export function plantillaHtml(cuerpo: string, pie: string): string {
  return `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f4f3ef;font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;color:#1b1f1e;">
  <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px;">
    <p style="margin:0 0 24px;font-size:20px;font-weight:800;color:#0b100f;">Alethe<span style="color:#7a5af8;">IA</span></p>
    ${cuerpo}
  </div>
  <p style="max-width:480px;margin:16px auto 0;font-size:12px;line-height:1.5;color:#6b6f6c;text-align:center;">${pie}</p>
</body></html>`;
}
