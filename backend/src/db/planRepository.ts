import { randomUUID } from "node:crypto";
import { runInUserTransaction } from "./context.js";
import type { Plan, Ventana } from "../plan/config.js";
import type { EstadoPlan } from "../plan/cupo.js";

/**
 * Persistencia del plan pago: columnas de plan en `users`, contador `uso_analisis` y
 * constancias en `solicitudes_plan` (ver la sección "Plan pago" de schema.sql y
 * migrate-plan.ts).
 *
 * Todas las queries corren con el contexto del usuario para que apliquen las policies de
 * RLS: `users` se filtra por firebase_uid y las tablas nuevas por el id interno. Ninguna
 * necesita el bypass, ni siquiera el webhook de Mercado Pago: la suscripción lleva el
 * firebase_uid en `external_reference` (lo pone el backend al crearla), así que el webhook
 * corre con el contexto de ESE usuario y no puede tocar a nadie más.
 */

export interface PlanDelUsuario extends EstadoPlan {
  mpPreapprovalId: string | null;
}

interface FilaPlan {
  plan: Plan;
  plan_desde: Date | null;
  plan_hasta: Date | null;
  mp_preapproval_id: string | null;
}

function mapearPlan(fila: FilaPlan): PlanDelUsuario {
  return {
    plan: fila.plan,
    planDesde: fila.plan_desde,
    planHasta: fila.plan_hasta,
    mpPreapprovalId: fila.mp_preapproval_id,
  };
}

/** Plan guardado del usuario (sin resolver vencimientos: eso es planVigente()). */
export async function getPlanDelUsuario(firebaseUid: string): Promise<PlanDelUsuario | null> {
  return runInUserTransaction({ firebaseUid }, async (client) => {
    const { rows } = await client.query<FilaPlan>(
      `SELECT plan, plan_desde, plan_hasta, mp_preapproval_id FROM users WHERE firebase_uid = $1`,
      [firebaseUid]
    );
    return rows[0] ? mapearPlan(rows[0]) : null;
  });
}

/** Análisis gastados por el usuario en el período `periodo` ('YYYY-MM-DD') de la ventana. */
export async function getUso(userId: string, ventana: Ventana, periodo: string): Promise<number> {
  return runInUserTransaction({ currentUserId: userId }, async (client) => {
    const { rows } = await client.query<{ analisis: number }>(
      `SELECT analisis FROM uso_analisis WHERE user_id = $1 AND ventana = $2 AND periodo = $3`,
      [userId, ventana, periodo]
    );
    return rows[0]?.analisis ?? 0;
  });
}

/**
 * Suma un análisis al contador del período si todavía no llegó a `limite`, en una sola
 * sentencia: el `WHERE` del DO UPDATE hace que dos pedidos simultáneos no puedan pasarse
 * del tope (Postgres serializa los dos UPDATE sobre la misma fila). Si ya no hay cupo no
 * cambia nada y devuelve `null`.
 */
export async function sumarUsoSiHayCupo(
  userId: string,
  ventana: Ventana,
  periodo: string,
  limite: number
): Promise<number | null> {
  return runInUserTransaction({ currentUserId: userId }, async (client) => {
    if (limite <= 0) return null;
    const { rows } = await client.query<{ analisis: number }>(
      `INSERT INTO uso_analisis (user_id, ventana, periodo, analisis) VALUES ($1, $2, $3, 1)
       ON CONFLICT (user_id, ventana, periodo) DO UPDATE
         SET analisis = uso_analisis.analisis + 1
         WHERE uso_analisis.analisis < $4
       RETURNING analisis`,
      [userId, ventana, periodo, limite]
    );
    return rows[0]?.analisis ?? null;
  });
}

/** Devuelve un análisis al cupo (el pedido falló sin gastar el resultado). */
export async function restarUso(userId: string, ventana: Ventana, periodo: string): Promise<void> {
  await runInUserTransaction({ currentUserId: userId }, async (client) => {
    await client.query(
      `UPDATE uso_analisis SET analisis = analisis - 1
        WHERE user_id = $1 AND ventana = $2 AND periodo = $3 AND analisis > 0`,
      [userId, ventana, periodo]
    );
  });
}

/**
 * Guarda la suscripción que el usuario acaba de iniciar (todavía sin pagar). Pisa la
 * anterior a propósito: si abandonó un checkout y abre otro, solo vale el último.
 */
export async function guardarSuscripcionIniciada(
  firebaseUid: string,
  preapprovalId: string
): Promise<void> {
  await runInUserTransaction({ firebaseUid }, async (client) => {
    await client.query(`UPDATE users SET mp_preapproval_id = $2 WHERE firebase_uid = $1`, [
      firebaseUid,
      preapprovalId,
    ]);
  });
}

/**
 * Aplica el estado de una suscripción de Mercado Pago. Solo toca la fila si
 * `mp_preapproval_id` coincide: el aviso tardío de una suscripción vieja (cancelada,
 * abandonada) nunca pisa la vigente. Devuelve false si no hubo fila que coincidiera.
 *
 * `plan_desde` se fija al pasar a Premium y se conserva mientras siga siéndolo (los
 * cobros de cada mes no reabren los días de arrepentimiento); al bajar se borra.
 */
export async function aplicarPlan(
  firebaseUid: string,
  preapprovalId: string,
  cambio: { plan: Plan; planHasta: Date | null }
): Promise<boolean> {
  return runInUserTransaction({ firebaseUid }, async (client) => {
    const resultado = await client.query(
      `UPDATE users SET
         plan = $3::text,
         plan_hasta = $4,
         plan_desde = CASE
           WHEN $3::text = 'premium' THEN
             CASE WHEN plan = 'premium' AND plan_desde IS NOT NULL THEN plan_desde ELSE now() END
           ELSE NULL
         END
       WHERE firebase_uid = $1 AND mp_preapproval_id = $2`,
      [firebaseUid, preapprovalId, cambio.plan, cambio.planHasta]
    );
    return (resultado.rowCount ?? 0) > 0;
  });
}

export type TipoSolicitud = "baja" | "arrepentimiento";

/**
 * Deja constancia de una baja o un arrepentimiento y devuelve su código (el uuid). El id
 * se genera acá y no con RETURNING: con RLS, RETURNING exige que la fila pase también la
 * policy de SELECT, y la de un pedido sin sesión (user_id NULL) no la pasa.
 */
export async function registrarSolicitud(solicitud: {
  userId: string | null;
  email: string | null;
  tipo: TipoSolicitud;
  estado: "resuelta" | "pendiente";
  mpPreapprovalId?: string | null;
  detalle?: string | null;
}): Promise<string> {
  const id = randomUUID();
  await runInUserTransaction({ currentUserId: solicitud.userId }, async (client) => {
    await client.query(
      `INSERT INTO solicitudes_plan (id, user_id, email, tipo, estado, mp_preapproval_id, detalle)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        id,
        solicitud.userId,
        solicitud.email,
        solicitud.tipo,
        solicitud.estado,
        solicitud.mpPreapprovalId ?? null,
        solicitud.detalle ?? null,
      ]
    );
  });
  return id;
}
