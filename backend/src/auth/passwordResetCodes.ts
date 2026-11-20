import { createHash, randomInt, timingSafeEqual } from "node:crypto";

/**
 * Códigos de 6 dígitos para "me olvidé la contraseña".
 *
 * Viven en memoria, igual que el rate limit (ver utils/rateLimiter.ts): el backend corre
 * en una sola instancia y un código dura 15 minutos, así que no vale una tabla. Si el
 * backend se reinicia en el medio, el código se pierde y la persona pide otro: es el único
 * costo. Si algún día hay varias instancias, esto tiene que pasar a Postgres.
 *
 * Seguridad:
 *  - Se guarda el hash, no el código: un volcado de memoria no da códigos usables.
 *  - 5 intentos por código. Con 10⁶ combinaciones, adivinar uno es 1 en 200.000, y pedir
 *    códigos nuevos está limitado por el rate limit de la ruta.
 *  - Pedir un código nuevo invalida el anterior.
 *  - Se compara en tiempo constante.
 */

const DURACION_MS = 15 * 60 * 1000;
export const MAX_INTENTOS = 5;
export const DURACION_MINUTOS = DURACION_MS / 60_000;

interface Pendiente {
  hash: Buffer;
  venceEn: number;
  intentos: number;
}

const pendientes = new Map<string, Pendiente>();

function hashear(email: string, codigo: string): Buffer {
  return createHash("sha256").update(`${email}:${codigo}`).digest();
}

/** El email normalizado, que es la clave: Firebase no distingue mayúsculas en el email. */
export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Genera un código nuevo para `email` (reemplaza al anterior) y lo devuelve en claro. */
export function crearCodigo(email: string): string {
  const codigo = randomInt(0, 1_000_000).toString().padStart(6, "0");
  pendientes.set(email, { hash: hashear(email, codigo), venceEn: Date.now() + DURACION_MS, intentos: 0 });
  return codigo;
}

export type ResultadoVerificacion = "ok" | "incorrecto" | "vencido" | "sin-intentos";

/**
 * Verifica el código. Un acierto NO lo consume (eso lo hace `consumirCodigo`, recién
 * cuando la contraseña se cambió de verdad), así un error de Firebase no obliga a pedir
 * otro mail. Cada error suma un intento; al llegar al máximo el código muere.
 */
export function verificarCodigo(email: string, codigo: string): ResultadoVerificacion {
  const pendiente = pendientes.get(email);
  if (!pendiente || Date.now() > pendiente.venceEn) {
    pendientes.delete(email);
    return "vencido";
  }
  if (pendiente.intentos >= MAX_INTENTOS) {
    pendientes.delete(email);
    return "sin-intentos";
  }

  const limpio = codigo.replace(/\D/g, "");
  if (limpio.length === 6 && timingSafeEqual(pendiente.hash, hashear(email, limpio))) return "ok";

  pendiente.intentos += 1;
  if (pendiente.intentos >= MAX_INTENTOS) {
    pendientes.delete(email);
    return "sin-intentos";
  }
  return "incorrecto";
}

export function consumirCodigo(email: string): void {
  pendientes.delete(email);
}

// Limpieza de los vencidos, para que el Map no crezca sin techo.
setInterval(() => {
  const ahora = Date.now();
  for (const [email, p] of pendientes) if (ahora > p.venceEn) pendientes.delete(email);
}, DURACION_MS).unref();
