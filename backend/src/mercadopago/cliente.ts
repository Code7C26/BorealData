import { randomUUID } from "node:crypto";
import { PRECIO_PREMIUM_ARS } from "../plan/config.js";
import type { Preapproval } from "./suscripcion.js";

/**
 * Cliente mínimo de la API de Mercado Pago (suscripciones sin plan asociado: /preapproval).
 * Con `fetch` nativo en vez del SDK: son pocas llamadas y no hace falta otra dependencia.
 *
 * Variables de entorno (ver .env.example):
 *   MP_ACCESS_TOKEN       access token de la cuenta VENDEDORA. En modo prueba, el de la
 *                         cuenta de prueba vendedora (Developers → Cuentas de prueba).
 *   MP_TEST_PAYER_EMAIL   solo en modo prueba: email del usuario de prueba COMPRADOR. Mercado
 *                         Pago exige que `payer_email` sea la cuenta que paga en el checkout,
 *                         y en modo prueba esa cuenta nunca es el email real de la persona.
 *   WEB_URL               a dónde vuelve la persona después de pagar. Default: el primer
 *                         origen de CORS_ORIGIN.
 */
const API = "https://api.mercadopago.com";

export class ErrorMercadoPago extends Error {
  constructor(
    readonly status: number,
    mensaje: string
  ) {
    super(mensaje);
  }
}

export function mercadoPagoConfigurado(): boolean {
  return Boolean(process.env.MP_ACCESS_TOKEN);
}

/** true si los cobros son de prueba (tarjetas y usuarios de prueba, sin plata real). */
export function modoPrueba(): boolean {
  const token = process.env.MP_ACCESS_TOKEN ?? "";
  return Boolean(process.env.MP_TEST_PAYER_EMAIL) || token.startsWith("TEST-");
}

export function urlDeLaWeb(): string {
  const explicita = process.env.WEB_URL?.trim();
  if (explicita) return explicita.replace(/\/$/, "");
  const primerOrigen = (process.env.CORS_ORIGIN ?? "http://localhost:3000").split(",")[0].trim();
  return primerOrigen.replace(/\/$/, "");
}

async function llamar<T>(ruta: string, opciones: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) throw new ErrorMercadoPago(503, "Falta MP_ACCESS_TOKEN: los pagos no están configurados.");

  const metodo = opciones.method ?? "GET";
  const res = await fetch(`${API}${ruta}`, {
    method: metodo,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      // Evita operaciones duplicadas si un reintento repite el mismo pedido.
      ...(metodo !== "GET" ? { "X-Idempotency-Key": randomUUID() } : {}),
    },
    body: opciones.body !== undefined ? JSON.stringify(opciones.body) : undefined,
    signal: AbortSignal.timeout(15_000),
  });

  const texto = await res.text();
  let datos: unknown = null;
  try {
    datos = texto ? JSON.parse(texto) : null;
  } catch {
    datos = texto;
  }

  if (!res.ok) {
    const mensaje =
      (datos as { message?: string } | null)?.message ?? `Mercado Pago respondió ${res.status}`;
    throw new ErrorMercadoPago(res.status, mensaje);
  }
  return datos as T;
}

/** Crea la suscripción mensual a Premium. La persona paga en `init_point`. */
export async function crearSuscripcion(entrada: {
  firebaseUid: string;
  email: string | null;
}): Promise<Preapproval> {
  const payerEmail = process.env.MP_TEST_PAYER_EMAIL?.trim() || entrada.email;
  if (!payerEmail) {
    throw new ErrorMercadoPago(400, "La cuenta no tiene email: Mercado Pago lo necesita para suscribirte.");
  }

  return llamar<Preapproval>("/preapproval", {
    method: "POST",
    body: {
      reason: "AletheIA Premium",
      external_reference: entrada.firebaseUid,
      payer_email: payerEmail,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: PRECIO_PREMIUM_ARS,
        currency_id: "ARS",
      },
      back_url: `${urlDeLaWeb()}/configuracion/plan?volver=mp`,
      // pending: se paga en el checkout de Mercado Pago (init_point), así la tarjeta nunca
      // pasa por nuestro servidor.
      status: "pending",
    },
  });
}

export function obtenerSuscripcion(id: string): Promise<Preapproval> {
  return llamar<Preapproval>(`/preapproval/${encodeURIComponent(id)}`);
}

export function cancelarSuscripcion(id: string): Promise<Preapproval> {
  return llamar<Preapproval>(`/preapproval/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: { status: "cancelled" },
  });
}

/** Cobro mensual de una suscripción (aviso `subscription_authorized_payment`). */
interface CobroAutorizado {
  id: number | string;
  preapproval_id: string;
  payment?: { id: number | string; status: string } | null;
}

export async function suscripcionDeUnCobro(idDelCobro: string): Promise<string> {
  const cobro = await llamar<CobroAutorizado>(`/authorized_payments/${encodeURIComponent(idDelCobro)}`);
  return cobro.preapproval_id;
}

/**
 * Botón de arrepentimiento: devuelve todo lo cobrado por la suscripción. Devuelve cuántos
 * pagos se reintegraron; si alguno falla tira el error, y quien llama deja la solicitud
 * pendiente para resolverla a mano.
 */
export async function reintegrarCobros(preapprovalId: string): Promise<number> {
  const { results } = await llamar<{ results?: CobroAutorizado[] }>(
    `/authorized_payments/search?preapproval_id=${encodeURIComponent(preapprovalId)}`
  );
  let reintegrados = 0;
  for (const cobro of results ?? []) {
    if (!cobro.payment || cobro.payment.status !== "approved") continue;
    await llamar(`/v1/payments/${encodeURIComponent(String(cobro.payment.id))}/refunds`, {
      method: "POST",
      body: {},
    });
    reintegrados += 1;
  }
  return reintegrados;
}
