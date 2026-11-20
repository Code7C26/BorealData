import { describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import { crearWebhookMercadoPago, type DependenciasWebhook } from "./mercadoPago.js";
import { firmaValida, firmarManifiesto, manifiestoDeFirma } from "../mercadopago/firma.js";
import { cambioDePlan, type Preapproval } from "../mercadopago/suscripcion.js";
import { DIAS_DE_GRACIA } from "../plan/config.js";

const SECRETO = "clave-secreta-de-prueba";
const UID = "firebase-uid-123";

/** Arma los headers tal como los manda Mercado Pago para un data.id dado. */
function headersFirmados(dataId: string, requestId = "req-abc", ts = "1763560000") {
  const v1 = firmarManifiesto(manifiestoDeFirma({ dataId, requestId, ts }), SECRETO);
  return { "x-signature": `ts=${ts},v1=${v1}`, "x-request-id": requestId };
}

function pedido(entrada: {
  query?: Record<string, string>;
  body?: unknown;
  headers?: Record<string, string>;
}): Request {
  const headers = Object.fromEntries(
    Object.entries(entrada.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v])
  );
  return {
    query: entrada.query ?? {},
    body: entrada.body ?? {},
    get: (nombre: string) => headers[nombre.toLowerCase()],
  } as unknown as Request;
}

function respuesta() {
  const res = { statusCode: 0, cuerpo: undefined as unknown };
  const obj = {
    status(code: number) {
      res.statusCode = code;
      return obj;
    },
    json(cuerpo: unknown) {
      res.cuerpo = cuerpo;
      return obj;
    },
  };
  return { res, obj: obj as unknown as Response };
}

function dependencias(preapproval: Partial<Preapproval> = {}): DependenciasWebhook {
  return {
    secreto: () => SECRETO,
    obtenerSuscripcion: vi.fn(async (id: string) => ({
      id,
      status: "authorized",
      external_reference: UID,
      next_payment_date: "2099-01-01T00:00:00.000Z",
      ...preapproval,
    })),
    suscripcionDeUnCobro: vi.fn(async () => "pre-desde-cobro"),
    aplicarPlan: vi.fn(async () => true),
  };
}

describe("firma del webhook", () => {
  it("acepta la firma bien hecha y rechaza otra clave, otro id u otro ts", () => {
    const h = headersFirmados("pre-1");
    const base = { xSignature: h["x-signature"], xRequestId: h["x-request-id"], dataId: "pre-1", secreto: SECRETO };
    expect(firmaValida(base)).toBe(true);
    expect(firmaValida({ ...base, secreto: "otra" })).toBe(false);
    expect(firmaValida({ ...base, dataId: "pre-2" })).toBe(false);
    expect(firmaValida({ ...base, xSignature: base.xSignature.replace("ts=1763560000", "ts=1") })).toBe(false);
    expect(firmaValida({ ...base, xSignature: undefined })).toBe(false);
  });

  it("usa el data.id en minúsculas, como Mercado Pago", () => {
    expect(manifiestoDeFirma({ dataId: "ABC123", requestId: "r", ts: "1" })).toBe("id:abc123;request-id:r;ts:1;");
  });
});

describe("estado de la suscripción → plan", () => {
  const ahora = new Date("2026-11-19T12:00:00Z");

  it("authorized pasa a premium hasta el próximo cobro más los días de gracia", () => {
    const cambio = cambioDePlan(
      { id: "p", status: "authorized", next_payment_date: "2026-12-19T12:00:00.000Z" },
      ahora
    );
    expect(cambio?.plan).toBe("premium");
    const esperado = new Date("2026-12-19T12:00:00.000Z").getTime() + DIAS_DE_GRACIA * 86_400_000;
    expect(cambio?.planHasta?.getTime()).toBe(esperado);
  });

  it("paused y cancelled bajan a gratuito; pending no cambia nada", () => {
    expect(cambioDePlan({ id: "p", status: "paused" }, ahora)).toEqual({ plan: "gratuito", planHasta: null });
    expect(cambioDePlan({ id: "p", status: "cancelled" }, ahora)).toEqual({ plan: "gratuito", planHasta: null });
    expect(cambioDePlan({ id: "p", status: "pending" }, ahora)).toBeNull();
  });
});

describe("POST /webhooks/mercadopago", () => {
  it("con firma válida, lee la suscripción de la API y pasa la cuenta a premium", async () => {
    const deps = dependencias();
    const { res, obj } = respuesta();
    await crearWebhookMercadoPago(deps)(
      pedido({
        query: { "data.id": "pre-1", type: "subscription_preapproval" },
        body: { type: "subscription_preapproval", data: { id: "pre-1" } },
        headers: headersFirmados("pre-1"),
      }),
      obj
    );

    expect(res.statusCode).toBe(200);
    expect(deps.obtenerSuscripcion).toHaveBeenCalledWith("pre-1");
    expect(deps.aplicarPlan).toHaveBeenCalledWith(
      UID,
      "pre-1",
      expect.objectContaining({ plan: "premium" })
    );
  });

  it("cancelled baja la cuenta a gratuito", async () => {
    const deps = dependencias({ status: "cancelled" });
    const { res, obj } = respuesta();
    await crearWebhookMercadoPago(deps)(
      pedido({
        query: { "data.id": "pre-1", type: "subscription_preapproval" },
        headers: headersFirmados("pre-1"),
      }),
      obj
    );
    expect(res.statusCode).toBe(200);
    expect(deps.aplicarPlan).toHaveBeenCalledWith(UID, "pre-1", { plan: "gratuito", planHasta: null });
  });

  it("un cobro mensual se resuelve a su suscripción y renueva el plan", async () => {
    const deps = dependencias();
    const { res, obj } = respuesta();
    await crearWebhookMercadoPago(deps)(
      pedido({
        query: { "data.id": "7001", type: "subscription_authorized_payment" },
        headers: headersFirmados("7001"),
      }),
      obj
    );
    expect(res.statusCode).toBe(200);
    expect(deps.suscripcionDeUnCobro).toHaveBeenCalledWith("7001");
    expect(deps.obtenerSuscripcion).toHaveBeenCalledWith("pre-desde-cobro");
  });

  it("sin firma válida responde 401 y no toca nada, aunque el body diga authorized", async () => {
    const deps = dependencias();
    const { res, obj } = respuesta();
    await crearWebhookMercadoPago(deps)(
      pedido({
        query: { "data.id": "pre-1", type: "subscription_preapproval" },
        body: { type: "subscription_preapproval", data: { id: "pre-1" }, status: "authorized" },
        headers: { "x-signature": "ts=1,v1=deadbeef", "x-request-id": "r" },
      }),
      obj
    );
    expect(res.statusCode).toBe(401);
    expect(deps.obtenerSuscripcion).not.toHaveBeenCalled();
    expect(deps.aplicarPlan).not.toHaveBeenCalled();
  });

  it("sin clave configurada responde 503", async () => {
    const deps = { ...dependencias(), secreto: () => "" };
    const { res, obj } = respuesta();
    await crearWebhookMercadoPago(deps)(
      pedido({ query: { "data.id": "pre-1", type: "subscription_preapproval" }, headers: headersFirmados("pre-1") }),
      obj
    );
    expect(res.statusCode).toBe(503);
  });

  it("otros tipos de aviso (pagos sueltos) se contestan 200 y se ignoran", async () => {
    const deps = dependencias();
    const { res, obj } = respuesta();
    await crearWebhookMercadoPago(deps)(
      pedido({ query: { "data.id": "9", type: "payment" }, headers: headersFirmados("9") }),
      obj
    );
    expect(res.statusCode).toBe(200);
    expect(deps.obtenerSuscripcion).not.toHaveBeenCalled();
  });

  it("una suscripción sin external_reference no le cambia el plan a nadie", async () => {
    const deps = dependencias({ external_reference: null });
    const { res, obj } = respuesta();
    await crearWebhookMercadoPago(deps)(
      pedido({ query: { "data.id": "pre-1", type: "subscription_preapproval" }, headers: headersFirmados("pre-1") }),
      obj
    );
    expect(res.statusCode).toBe(200);
    expect(deps.aplicarPlan).not.toHaveBeenCalled();
  });

  it("si la API de Mercado Pago falla responde 500 para que reintente", async () => {
    const deps = dependencias();
    deps.obtenerSuscripcion = vi.fn(async () => {
      throw new Error("timeout");
    });
    const { res, obj } = respuesta();
    await crearWebhookMercadoPago(deps)(
      pedido({ query: { "data.id": "pre-1", type: "subscription_preapproval" }, headers: headersFirmados("pre-1") }),
      obj
    );
    expect(res.statusCode).toBe(500);
  });
});
