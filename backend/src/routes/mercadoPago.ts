import { Router, type Request, type Response } from "express";
import { firmaValida } from "../mercadopago/firma.js";
import { obtenerSuscripcion, suscripcionDeUnCobro } from "../mercadopago/cliente.js";
import { sincronizarSuscripcion, type AplicarPlan } from "../mercadopago/sincronizar.js";
import { aplicarPlan } from "../db/planRepository.js";
import type { Preapproval } from "../mercadopago/suscripcion.js";
import { log, mensajeDeError } from "../utils/logger.js";

export interface DependenciasWebhook {
  /** Clave secreta del webhook (MP_WEBHOOK_SECRET). Vacía = webhook deshabilitado. */
  secreto: () => string;
  obtenerSuscripcion: (id: string) => Promise<Preapproval>;
  suscripcionDeUnCobro: (idDelCobro: string) => Promise<string>;
  aplicarPlan: AplicarPlan;
}

function primerValor(valor: unknown): string | null {
  if (typeof valor === "string" && valor.length > 0) return valor;
  if (Array.isArray(valor) && typeof valor[0] === "string") return valor[0];
  return null;
}

/**
 * POST /webhooks/mercadopago — avisos de Mercado Pago sobre suscripciones.
 *
 * Se configura en Developers → tu aplicación → Webhooks, con la URL pública del backend
 * (`https://aletheiainc.online/api/webhooks/mercadopago`) y los eventos de "Planes y
 * suscripciones". Ahí mismo está la clave secreta, que va en MP_WEBHOOK_SECRET.
 *
 * Flujo:
 *   1. Valida la firma (x-signature) con la clave secreta: sin firma válida, 401.
 *   2. Resuelve qué suscripción cambió:
 *        subscription_preapproval          → data.id ES la suscripción.
 *        subscription_authorized_payment   → data.id es un cobro mensual; se pide a la API
 *                                            a qué suscripción pertenece (renueva plan_hasta).
 *      Cualquier otro tipo de aviso se contesta 200 y se ignora.
 *   3. Pide la suscripción a la API (nunca confía en el body) y la aplica al plan.
 *
 * Responde 200 aunque la suscripción no sea la vigente del usuario: para Mercado Pago el
 * aviso se recibió bien, y repetirlo no cambiaría nada. Responde 500 si falla la API o la
 * base: Mercado Pago reintenta, y aplicar el mismo estado dos veces no hace daño.
 */
export function crearWebhookMercadoPago(deps: DependenciasWebhook) {
  return async function webhook(req: Request, res: Response) {
    const query = req.query as Record<string, unknown>;
    const body = (req.body ?? {}) as { type?: unknown; data?: { id?: unknown } };

    const tipo = primerValor(query.type) ?? primerValor(query.topic) ?? primerValor(body.type);
    // La firma se arma con el data.id de la query; el del body es solo respaldo para leerlo.
    const dataIdDeLaQuery = primerValor(query["data.id"]);
    const dataId =
      dataIdDeLaQuery ?? (body.data?.id !== undefined ? String(body.data.id) : null);

    const secreto = deps.secreto();
    if (!secreto) {
      log.error("mp.webhook.sinSecreto", { tipo });
      return res.status(503).json({ error: "Webhook sin configurar (falta MP_WEBHOOK_SECRET)." });
    }

    const valida = firmaValida({
      xSignature: req.get("x-signature"),
      xRequestId: req.get("x-request-id"),
      dataId: dataIdDeLaQuery,
      secreto,
    });
    if (!valida) {
      log.warn("mp.webhook.firmaInvalida", { tipo, dataId });
      return res.status(401).json({ error: "Firma inválida." });
    }

    if (!dataId || (tipo !== "subscription_preapproval" && tipo !== "subscription_authorized_payment")) {
      return res.status(200).json({ ok: true, ignorado: true });
    }

    try {
      const preapprovalId =
        tipo === "subscription_preapproval" ? dataId : await deps.suscripcionDeUnCobro(dataId);
      const preapproval = await deps.obtenerSuscripcion(preapprovalId);
      const resultado = await sincronizarSuscripcion(preapproval, deps.aplicarPlan);

      log.info("mp.webhook", {
        tipo,
        preapprovalId,
        status: preapproval.status,
        resultado: resultado.estado,
        plan: resultado.estado === "aplicado" ? resultado.cambio.plan : null,
      });
      return res.status(200).json({ ok: true, resultado: resultado.estado });
    } catch (err) {
      log.error("mp.webhook.error", { tipo, dataId, detail: mensajeDeError(err) });
      return res.status(500).json({ error: "No se pudo procesar el aviso." });
    }
  };
}

const router = Router();

router.post(
  "/webhooks/mercadopago",
  crearWebhookMercadoPago({
    secreto: () => process.env.MP_WEBHOOK_SECRET ?? "",
    obtenerSuscripcion,
    suscripcionDeUnCobro,
    aplicarPlan,
  })
);

export default router;
