import { Router, type Request, type Response } from "express";
import { requireAuth } from "../auth/verifyAuth.js";
import { upsertUser } from "../db/usersRepository.js";
import {
  aplicarPlan,
  getPlanDelUsuario,
  getUso,
  guardarSuscripcionIniciada,
  registrarSolicitud,
  type TipoSolicitud,
} from "../db/planRepository.js";
import {
  cancelarSuscripcion,
  crearSuscripcion,
  ErrorMercadoPago,
  mercadoPagoConfigurado,
  modoPrueba,
  obtenerSuscripcion,
  reintegrarCobros,
} from "../mercadopago/cliente.js";
import { sincronizarSuscripcion } from "../mercadopago/sincronizar.js";
import { CUPOS, DIAS_ARREPENTIMIENTO, PRECIO_PREMIUM_ARS } from "../plan/config.js";
import {
  cupoDelPlan,
  periodoDelCupo,
  planVigente,
  puedeArrepentirse,
  renovacionDelCupo,
} from "../plan/cupo.js";
import { FixedWindowRateLimiter } from "../utils/rateLimiter.js";
import { log, mensajeDeError } from "../utils/logger.js";

const router = Router();

/** 42703 = columna inexistente, 42P01 = tabla inexistente: falta correr migrate-plan.ts. */
function faltaLaMigracion(err: unknown): boolean {
  const code = (err as { code?: string } | null)?.code;
  return code === "42703" || code === "42P01";
}

function responderError(res: Response, contexto: string, err: unknown) {
  if (faltaLaMigracion(err)) {
    log.error(`${contexto}.faltaMigracion`, { detail: mensajeDeError(err) });
    return res.status(503).json({
      error: "El plan pago todavía no está habilitado en la base de datos. Falta correr backend/migrate-plan.ts.",
    });
  }
  if (err instanceof ErrorMercadoPago) {
    log.error(`${contexto}.mercadoPago`, { status: err.status, detail: err.message });
    return res.status(err.status === 503 ? 503 : 502).json({
      error: "Mercado Pago no respondió como esperábamos. Probá de nuevo en un rato.",
      detail: err.message,
    });
  }
  log.error(`${contexto}.error`, { detail: mensajeDeError(err) });
  return res.status(500).json({ error: "Error inesperado con el plan.", detail: mensajeDeError(err) });
}

/** Estado completo de "Tu plan", el mismo que devuelven GET /plan y las acciones. */
async function estadoDelPlan(firebaseUid: string, userId: string) {
  const ahora = new Date();
  const guardado = await getPlanDelUsuario(firebaseUid);
  const estado = guardado ?? { plan: "gratuito" as const, planDesde: null, planHasta: null, mpPreapprovalId: null };
  const plan = planVigente(estado, ahora);
  const { limite, ventana } = cupoDelPlan(plan);
  const periodo = periodoDelCupo(ventana, ahora);

  return {
    plan,
    planDesde: plan === "premium" ? (estado.planDesde?.toISOString() ?? null) : null,
    planHasta: plan === "premium" ? (estado.planHasta?.toISOString() ?? null) : null,
    uso: {
      usados: await getUso(userId, ventana, periodo),
      limite,
      /** 'dia' (Gratuito) o 'mes' (Premium). */
      ventana,
      /** 'YYYY-MM-DD': hoy, o el día 1 del mes. */
      periodo,
      renueva: renovacionDelCupo(ventana, ahora),
    },
    cupos: CUPOS,
    precio: { monto: PRECIO_PREMIUM_ARS, moneda: "ARS" },
    puedeArrepentirse: puedeArrepentirse(estado, ahora),
    diasArrepentimiento: DIAS_ARREPENTIMIENTO,
    pagos: { habilitados: mercadoPagoConfigurado(), modoPrueba: modoPrueba() },
  };
}

async function resolverUsuario(req: Request, res: Response): Promise<string | null> {
  const userId = await upsertUser(req.user!.uid, req.user!.email);
  if (!userId) {
    res.status(500).json({ error: "No se pudo resolver el usuario en la base de datos." });
    return null;
  }
  return userId;
}

/**
 * GET /plan — "Tu plan": plan vigente, uso del día (Gratuito) o del mes (Premium), precio y si quedan días para
 * arrepentirse. Header obligatorio: Authorization: Bearer <Firebase ID token>.
 */
router.get("/plan", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = await resolverUsuario(req, res);
    if (!userId) return;
    return res.status(200).json(await estadoDelPlan(req.user!.uid, userId));
  } catch (err) {
    return responderError(res, "plan.get", err);
  }
});

/**
 * POST /plan/suscribir — crea la suscripción mensual en Mercado Pago y devuelve
 * `{ initPoint }`, el checkout de Mercado Pago al que el front redirige. La cuenta pasa a
 * Premium recién cuando el webhook (o /plan/sincronizar) ve la suscripción `authorized`.
 */
router.post("/plan/suscribir", requireAuth, async (req: Request, res: Response) => {
  const uid = req.user!.uid;
  try {
    if (!mercadoPagoConfigurado()) {
      return res.status(503).json({ error: "Los pagos todavía no están habilitados." });
    }
    const userId = await resolverUsuario(req, res);
    if (!userId) return;

    const estado = await getPlanDelUsuario(uid);
    if (estado && planVigente(estado) === "premium") {
      return res.status(409).json({ error: "Ya tenés Premium.", code: "ya_premium" });
    }

    const suscripcion = await crearSuscripcion({ firebaseUid: uid, email: req.user!.email });
    if (!suscripcion.init_point) {
      throw new ErrorMercadoPago(502, "Mercado Pago no devolvió el link de pago (init_point).");
    }
    await guardarSuscripcionIniciada(uid, suscripcion.id);

    log.info("plan.suscribir", { uid, preapprovalId: suscripcion.id, modoPrueba: modoPrueba() });
    return res.status(200).json({ initPoint: suscripcion.init_point });
  } catch (err) {
    return responderError(res, "plan.suscribir", err);
  }
});

/**
 * POST /plan/sincronizar — vuelve a leer la suscripción del usuario en Mercado Pago y la
 * aplica. La llama "Tu plan" al volver del checkout: es el respaldo del webhook, que en
 * local no llega sin un túnel público, y evita que la persona vuelva y siga viendo
 * "Gratuito" durante los segundos que tarda el aviso.
 */
router.post("/plan/sincronizar", requireAuth, async (req: Request, res: Response) => {
  const uid = req.user!.uid;
  try {
    const userId = await resolverUsuario(req, res);
    if (!userId) return;

    const estado = await getPlanDelUsuario(uid);
    let status: string | null = null;
    if (estado?.mpPreapprovalId && mercadoPagoConfigurado()) {
      const suscripcion = await obtenerSuscripcion(estado.mpPreapprovalId);
      status = suscripcion.status;
      // Doble chequeo: la suscripción guardada tiene que ser de este usuario.
      if (suscripcion.external_reference === uid) {
        const resultado = await sincronizarSuscripcion(suscripcion);
        log.info("plan.sincronizar", { uid, status, resultado: resultado.estado });
      }
    }

    return res.status(200).json({ ...(await estadoDelPlan(uid, userId)), suscripcion: { status } });
  } catch (err) {
    return responderError(res, "plan.sincronizar", err);
  }
});

const TIPOS_DE_SOLICITUD: readonly TipoSolicitud[] = ["baja", "arrepentimiento"];

/**
 * POST /plan/cancelar — botón de baja y botón de arrepentimiento (Disposición 954/2025).
 * Body: { "tipo": "baja" | "arrepentimiento" }
 *
 *   baja             cancela la suscripción en Mercado Pago y la cuenta vuelve a Gratuito.
 *   arrepentimiento  lo mismo y además reintegra lo cobrado. Solo dentro de los
 *                    DIAS_ARREPENTIMIENTO desde que empezó Premium.
 *
 * Las dos dejan constancia en `solicitudes_plan` y devuelven su código. Si el reintegro
 * falla, la baja igual se hace y la constancia queda 'pendiente' para reintegrar a mano.
 */
router.post("/plan/cancelar", requireAuth, async (req: Request, res: Response) => {
  const uid = req.user!.uid;
  const tipo = (req.body ?? {}).tipo as TipoSolicitud;
  if (!TIPOS_DE_SOLICITUD.includes(tipo)) {
    return res.status(400).json({ error: "Falta 'tipo': 'baja' o 'arrepentimiento'." });
  }

  try {
    const userId = await resolverUsuario(req, res);
    if (!userId) return;

    const estado = await getPlanDelUsuario(uid);
    if (!estado?.mpPreapprovalId || planVigente(estado) !== "premium") {
      return res.status(409).json({ error: "No tenés una suscripción activa.", code: "sin_suscripcion" });
    }
    if (tipo === "arrepentimiento" && !puedeArrepentirse(estado)) {
      return res.status(409).json({
        error: `Pasaron más de ${DIAS_ARREPENTIMIENTO} días desde que empezó tu suscripción: podés darte de baja, pero ya no corresponde el arrepentimiento.`,
        code: "fuera_de_plazo",
      });
    }

    const preapprovalId = estado.mpPreapprovalId;
    // Primero Mercado Pago: si no se pudo cancelar el cobro, bajar la cuenta sería peor
    // (dejaría de tener Premium y le seguirían cobrando).
    await cancelarSuscripcion(preapprovalId);
    await aplicarPlan(uid, preapprovalId, { plan: "gratuito", planHasta: null });

    let reintegrados = 0;
    let reintegroPendiente = false;
    let detalle: string | null = null;
    if (tipo === "arrepentimiento") {
      try {
        reintegrados = await reintegrarCobros(preapprovalId);
      } catch (err) {
        reintegroPendiente = true;
        detalle = `Reintegro automático fallido: ${mensajeDeError(err)}`;
        log.error("plan.reintegro", { uid, preapprovalId, detail: mensajeDeError(err) });
      }
    }

    const codigo = await registrarSolicitud({
      userId,
      email: req.user!.email,
      tipo,
      estado: reintegroPendiente ? "pendiente" : "resuelta",
      mpPreapprovalId: preapprovalId,
      detalle,
    });

    log.info("plan.cancelar", { uid, tipo, preapprovalId, reintegrados, reintegroPendiente });
    return res.status(200).json({
      codigo,
      tipo,
      reintegrados,
      reintegroPendiente,
      ...(await estadoDelPlan(uid, userId)),
    });
  } catch (err) {
    return responderError(res, "plan.cancelar", err);
  }
});

// Formulario público: 5 pedidos por hora por IP alcanzan para una persona y frenan spam.
const solicitudesPorIp = new FixedWindowRateLimiter(5, 60 * 60 * 1000);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * En producción el backend está detrás de Traefik, así que `req.ip` es siempre el de
 * Traefik. Traefik AGREGA la IP real al final de X-Forwarded-For; lo que viene antes lo
 * puede escribir el cliente, por eso se toma la última y no la primera.
 */
function ipDelCliente(req: Request): string {
  const reenviada = req.get("x-forwarded-for")?.split(",").pop()?.trim();
  return reenviada || req.ip || "desconocida";
}

/**
 * POST /plan/solicitud — botón de baja o de arrepentimiento SIN sesión.
 * Body: { "email": "...", "tipo": "baja" | "arrepentimiento" }
 *
 * La norma pide que se pueda pedir la baja sin trámites extra, y alguien puede no tener la
 * sesión abierta en ese dispositivo. Como sin sesión no se puede probar que la cuenta es
 * suya, no se cancela nada automáticamente (cualquiera podría dar de baja a otro): se deja
 * la constancia 'pendiente' con su código, y el equipo la resuelve contra el email.
 */
router.post("/plan/solicitud", async (req: Request, res: Response) => {
  const { email: rawEmail, tipo } = (req.body ?? {}) as { email?: unknown; tipo?: unknown };
  const email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";

  if (!EMAIL.test(email) || email.length > 254) {
    return res.status(400).json({ error: "Escribí el email de tu cuenta." });
  }
  if (!TIPOS_DE_SOLICITUD.includes(tipo as TipoSolicitud)) {
    return res.status(400).json({ error: "Falta 'tipo': 'baja' o 'arrepentimiento'." });
  }

  const limite = solicitudesPorIp.consume(ipDelCliente(req));
  if (!limite.allowed) {
    res.set("Retry-After", String(limite.retryAfterSeconds));
    return res.status(429).json({ error: "Demasiados pedidos seguidos. Probá de nuevo en un rato." });
  }

  try {
    const codigo = await registrarSolicitud({
      userId: null,
      email,
      tipo: tipo as TipoSolicitud,
      estado: "pendiente",
    });
    // Sin el email en el log: es un dato personal y ya queda en la base.
    log.info("plan.solicitudSinSesion", { tipo: tipo as string, codigo });
    return res.status(200).json({ codigo });
  } catch (err) {
    return responderError(res, "plan.solicitud", err);
  }
});

export default router;
