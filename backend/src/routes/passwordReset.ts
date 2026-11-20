import { Router, type Request, type Response } from "express";
import { getFirebaseAuth, tieneCredencialesDeAdmin } from "../auth/firebaseAdmin.js";
import {
  consumirCodigo,
  crearCodigo,
  DURACION_MINUTOS,
  normalizarEmail,
  verificarCodigo,
} from "../auth/passwordResetCodes.js";
import { escaparHtml, enviarMail, mailConfigurado, plantillaHtml } from "../mail/mailer.js";
import { parseLanguage, type Language } from "../gemini/types.js";
import { log } from "../utils/logger.js";
import { FixedWindowRateLimiter } from "../utils/rateLimiter.js";

const router = Router();

/** Igual que el mínimo del registro y del perfil en la web (MIN_PASSWORD). */
const MIN_PASSWORD = 8;
const MAX_PASSWORD = 128;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Pedir códigos: 3 por email y 10 por IP cada 15 minutos. El de email evita que alguien
 * llene de mails la casilla de otra persona; el de IP, que se usen muchos emails desde el
 * mismo lugar. Confirmar tiene su propio tope, además de los 5 intentos por código.
 */
const pedidosPorEmail = new FixedWindowRateLimiter(3, 15 * 60 * 1000);
const pedidosPorIp = new FixedWindowRateLimiter(10, 15 * 60 * 1000);
const confirmacionesPorIp = new FixedWindowRateLimiter(20, 15 * 60 * 1000);

const MAIL = {
  es: {
    asunto: (codigo: string) => `${codigo} es tu código para cambiar la contraseña`,
    texto: (codigo: string) =>
      `Tu código para cambiar la contraseña de AletheIA es ${codigo}.\n\n` +
      `Vence en ${DURACION_MINUTOS} minutos. Si no lo pediste vos, ignorá este mail: tu contraseña no cambia.`,
    titulo: "Cambiá tu contraseña",
    bajada: "Escribí este código en AletheIA para elegir una contraseña nueva:",
    vence: `Vence en ${DURACION_MINUTOS} minutos.`,
    pie: "Si no lo pediste vos, ignorá este mail: tu contraseña no cambia.",
  },
  en: {
    asunto: (codigo: string) => `${codigo} is your code to reset your password`,
    texto: (codigo: string) =>
      `Your code to reset your AletheIA password is ${codigo}.\n\n` +
      `It expires in ${DURACION_MINUTOS} minutes. If you didn't ask for it, ignore this email: your password won't change.`,
    titulo: "Reset your password",
    bajada: "Enter this code in AletheIA to choose a new password:",
    vence: `It expires in ${DURACION_MINUTOS} minutes.`,
    pie: "If you didn't ask for it, ignore this email: your password won't change.",
  },
} satisfies Record<Language, unknown>;

function mailDelCodigo(codigo: string, language: Language) {
  const t = MAIL[language];
  const cuerpo = `
    <h1 style="margin:0 0 8px;font-size:22px;color:#0b100f;">${t.titulo}</h1>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.5;color:#3d4240;">${t.bajada}</p>
    <p style="margin:0 0 20px;padding:16px;border-radius:12px;background:#f1edff;text-align:center;font-family:'SFMono-Regular',Consolas,monospace;font-size:32px;letter-spacing:8px;font-weight:700;color:#4b2fc9;">${escaparHtml(codigo)}</p>
    <p style="margin:0;font-size:13px;color:#6b6f6c;">${t.vence}</p>`;
  return {
    subject: t.asunto(codigo),
    text: t.texto(codigo),
    html: plantillaHtml(cuerpo, t.pie),
  };
}

/** Lo que falta configurar en el servidor, o null si está todo. */
function faltaConfiguracion(): string | null {
  if (!mailConfigurado()) return "SMTP_HOST, SMTP_USER y SMTP_PASS";
  if (!tieneCredencialesDeAdmin()) return "FIREBASE_ADMIN_CREDENTIALS";
  return null;
}

function ipDe(req: Request): string {
  // Detrás de Traefik, la IP real viene en X-Forwarded-For (la primera de la lista).
  const reenviada = req.headers["x-forwarded-for"];
  const primera = (Array.isArray(reenviada) ? reenviada[0] : reenviada)?.split(",")[0]?.trim();
  return primera || req.ip || "desconocida";
}

/**
 * POST /auth/password-reset/request
 * Body: { "email": "...", "language": "es" | "en" }
 *
 * Manda un código de 6 dígitos al email, si existe una cuenta con ese email. Responde
 * lo mismo exista o no: si no, cualquiera podría usar esto para averiguar quién tiene
 * cuenta.
 */
router.post("/auth/password-reset/request", async (req: Request, res: Response) => {
  const { email: crudo, language: idioma } = req.body ?? {};
  if (typeof crudo !== "string" || !EMAIL_RE.test(crudo.trim()) || crudo.length > 254) {
    return res.status(400).json({ error: "Escribí un email válido." });
  }
  const email = normalizarEmail(crudo);
  const language = parseLanguage(idioma) ?? "es";

  const falta = faltaConfiguracion();
  if (falta) {
    log.error("passwordReset.sinConfiguracion", { falta });
    return res.status(503).json({
      error: "La recuperación de contraseña todavía no está habilitada en el servidor.",
      detail: `Falta configurar ${falta}.`,
    });
  }

  const porIp = pedidosPorIp.consume(ipDe(req));
  const porEmail = pedidosPorEmail.consume(email);
  if (!porIp.allowed || !porEmail.allowed) {
    const espera = Math.max(porIp.retryAfterSeconds, porEmail.retryAfterSeconds);
    res.setHeader("Retry-After", String(espera));
    return res.status(429).json({
      error: "Pediste demasiados códigos. Esperá unos minutos y probá de nuevo.",
      retryAfterSeconds: espera,
    });
  }

  try {
    await getFirebaseAuth().getUserByEmail(email);
  } catch (err) {
    if ((err as { code?: string }).code === "auth/user-not-found") {
      // Misma respuesta que el caso real (ver arriba). No se manda nada.
      return res.status(200).json({ sent: true });
    }
    log.error("passwordReset.firebase", { detail: err instanceof Error ? err.message : String(err) });
    return res.status(500).json({ error: "No pudimos enviar el código. Probá de nuevo en unos minutos." });
  }

  const codigo = crearCodigo(email);
  try {
    await enviarMail({ to: email, ...mailDelCodigo(codigo, language) });
  } catch (err) {
    consumirCodigo(email);
    log.error("passwordReset.mail", { detail: err instanceof Error ? err.message : String(err) });
    return res.status(502).json({ error: "No pudimos enviar el mail. Probá de nuevo en unos minutos." });
  }

  return res.status(200).json({ sent: true });
});

/**
 * POST /auth/password-reset/confirm
 * Body: { "email": "...", "code": "123456", "password": "nueva" }
 *
 * Cambia la contraseña si el código es correcto. Además cierra las sesiones abiertas en
 * otros dispositivos (revokeRefreshTokens): si alguien entró con la contraseña vieja,
 * deja de tener acceso.
 */
router.post("/auth/password-reset/confirm", async (req: Request, res: Response) => {
  const { email: crudo, code, password } = req.body ?? {};
  if (typeof crudo !== "string" || typeof code !== "string" || typeof password !== "string") {
    return res.status(400).json({ error: "Faltan el email, el código o la contraseña nueva." });
  }
  if (password.length < MIN_PASSWORD || password.length > MAX_PASSWORD) {
    return res.status(400).json({ error: `La contraseña necesita al menos ${MIN_PASSWORD} caracteres.` });
  }

  const intento = confirmacionesPorIp.consume(ipDe(req));
  if (!intento.allowed) {
    res.setHeader("Retry-After", String(intento.retryAfterSeconds));
    return res.status(429).json({ error: "Demasiados intentos. Esperá unos minutos y probá de nuevo." });
  }

  const email = normalizarEmail(crudo);
  const resultado = verificarCodigo(email, code);
  if (resultado === "incorrecto") {
    return res.status(400).json({ error: "El código no es correcto.", reason: resultado });
  }
  if (resultado !== "ok") {
    return res.status(400).json({
      error: "El código venció o se usó demasiadas veces. Pedí uno nuevo.",
      reason: resultado,
    });
  }

  try {
    const auth = getFirebaseAuth();
    const { uid } = await auth.getUserByEmail(email);
    // El email quedó verificado de hecho: la persona acaba de leer un código que llegó ahí.
    await auth.updateUser(uid, { password, emailVerified: true });
    await auth.revokeRefreshTokens(uid);
    consumirCodigo(email);
    log.info("passwordReset.ok", {});
    return res.status(200).json({ changed: true });
  } catch (err) {
    log.error("passwordReset.update", { detail: err instanceof Error ? err.message : String(err) });
    return res.status(500).json({ error: "No pudimos cambiar la contraseña. Probá de nuevo en unos minutos." });
  }
});

export default router;
