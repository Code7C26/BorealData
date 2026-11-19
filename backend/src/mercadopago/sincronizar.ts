import { aplicarPlan } from "../db/planRepository.js";
import { cambioDePlan, type CambioDePlan, type Preapproval } from "./suscripcion.js";

export type ResultadoSincronizacion =
  /** El plan del usuario quedó como dice Mercado Pago. */
  | { estado: "aplicado"; cambio: CambioDePlan }
  /** pending u otro estado que no cambia nada todavía. */
  | { estado: "sin-cambios" }
  /** La suscripción no es la vigente del usuario (o no tiene dueño): no se toca nada. */
  | { estado: "ignorado"; motivo: string };

export type AplicarPlan = (
  firebaseUid: string,
  preapprovalId: string,
  cambio: CambioDePlan
) => Promise<boolean>;

/**
 * Lleva el estado de una suscripción (ya leída de la API de Mercado Pago, nunca del body
 * de un aviso) al plan del usuario. La usan el webhook y POST /plan/sincronizar, que es el
 * camino de respaldo cuando el webhook no llega (en local, sin un túnel público).
 */
export async function sincronizarSuscripcion(
  preapproval: Preapproval,
  aplicar: AplicarPlan = aplicarPlan,
  ahora: Date = new Date()
): Promise<ResultadoSincronizacion> {
  const firebaseUid = preapproval.external_reference;
  if (!firebaseUid) return { estado: "ignorado", motivo: "sin external_reference" };

  const cambio = cambioDePlan(preapproval, ahora);
  if (!cambio) return { estado: "sin-cambios" };

  const aplicado = await aplicar(firebaseUid, preapproval.id, cambio);
  return aplicado
    ? { estado: "aplicado", cambio }
    : { estado: "ignorado", motivo: "no es la suscripción vigente del usuario" };
}
