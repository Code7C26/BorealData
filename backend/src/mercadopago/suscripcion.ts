import { DIAS_DE_GRACIA, type Plan } from "../plan/config.js";

/**
 * Lo que el backend usa de una suscripción (preapproval) de Mercado Pago, tal como la
 * devuelve GET /preapproval/{id}. Hay más campos; estos son los que importan.
 */
export interface Preapproval {
  id: string;
  /** pending (sin pagar todavía) | authorized | paused | cancelled */
  status: string;
  /** Lo pone el backend al crearla: el firebase_uid del usuario. */
  external_reference?: string | null;
  init_point?: string;
  next_payment_date?: string | null;
  date_created?: string;
}

export type CambioDePlan = { plan: Plan; planHasta: Date | null };

const DIA_MS = 24 * 60 * 60 * 1000;

/**
 * Traduce el estado de la suscripción a un cambio de plan, o `null` si no hay que cambiar
 * nada (pending: el checkout se abrió pero todavía no se pagó).
 *
 *   authorized         → Premium hasta la fecha del próximo cobro + DIAS_DE_GRACIA. Si
 *                        Mercado Pago no manda la fecha (o ya pasó), un mes desde hoy.
 *   paused / cancelled → Gratuito, ya.
 */
export function cambioDePlan(preapproval: Preapproval, ahora: Date = new Date()): CambioDePlan | null {
  switch (preapproval.status) {
    case "authorized": {
      const proximo = preapproval.next_payment_date ? new Date(preapproval.next_payment_date) : null;
      const base =
        proximo && !Number.isNaN(proximo.getTime()) && proximo.getTime() > ahora.getTime()
          ? proximo
          : sumarUnMes(ahora);
      return { plan: "premium", planHasta: new Date(base.getTime() + DIAS_DE_GRACIA * DIA_MS) };
    }
    case "paused":
    case "cancelled":
      return { plan: "gratuito", planHasta: null };
    default:
      return null;
  }
}

function sumarUnMes(fecha: Date): Date {
  const copia = new Date(fecha.getTime());
  copia.setUTCMonth(copia.getUTCMonth() + 1);
  return copia;
}
