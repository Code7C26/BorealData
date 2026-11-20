import { getPlanDelUsuario, restarUso, sumarUsoSiHayCupo } from "../db/planRepository.js";
import { log, mensajeDeError } from "../utils/logger.js";
import type { Plan, Ventana } from "./config.js";
import {
  cupoDelPlan,
  mensajeDeCupoAgotado,
  periodoDelCupo,
  planVigente,
  renovacionDelCupo,
  type EstadoPlan,
} from "./cupo.js";

/**
 * Cupo de análisis nuevos por plan (Gratuito: por día; Premium: por mes), en Postgres:
 * sobrevive a reinicios y se comparte entre instancias, a diferencia del límite de ráfaga
 * por hora de utils/analyzeLimiter.ts, que sigue en memoria. Lo usan /analyze (solo sin
 * acierto de caché) y /analyze/content.
 *
 * Se consume ANTES de llamar a Gemini y se devuelve con `devolver()` si el análisis falla:
 * cobrar por adelantado es lo único que frena dos pedidos simultáneos en el último lugar
 * del cupo.
 *
 * Si la base falla (o falta correr migrate-plan.ts) deja pasar y lo loguea como error: un
 * problema del contador no puede tumbar el producto, pero tiene que verse en los logs.
 */
export type ResultadoCupo =
  | {
      permitido: true;
      /** El plan vigente: decide la ráfaga por hora (utils/analyzeLimiter.ts). */
      plan: Plan;
      devolver: () => Promise<void>;
    }
  | {
      permitido: false;
      plan: Plan;
      ventana: Ventana;
      usados: number;
      limite: number;
      /** Día en que se renueva, 'YYYY-MM-DD'. */
      renueva: string;
      mensaje: string;
    };

export interface DependenciasCupo {
  getPlan: (firebaseUid: string) => Promise<EstadoPlan | null>;
  sumarUsoSiHayCupo: (
    userId: string,
    ventana: Ventana,
    periodo: string,
    limite: number
  ) => Promise<number | null>;
  restarUso: (userId: string, ventana: Ventana, periodo: string) => Promise<void>;
  ahora?: () => Date;
}

const SIN_COSTO = async () => {};

export function crearControlDeCupo(deps: DependenciasCupo) {
  return async function consumirCupo(
    firebaseUid: string,
    userId: string | null
  ): Promise<ResultadoCupo> {
    // Sin id interno (upsertUser falló) no hay contra qué contar: mismo criterio que con
    // la base caída.
    if (!userId) {
      log.error("cupo.sinUsuario", { uid: firebaseUid });
      return { permitido: true, plan: "gratuito", devolver: SIN_COSTO };
    }

    const ahora = deps.ahora?.() ?? new Date();

    try {
      const estado = await deps.getPlan(firebaseUid);
      const plan = estado ? planVigente(estado, ahora) : "gratuito";
      const { limite, ventana } = cupoDelPlan(plan);
      // El período se fija acá y lo reusa devolver(): si el análisis termina pasada la
      // medianoche, la unidad vuelve al día en que se descontó.
      const periodo = periodoDelCupo(ventana, ahora);

      const usados = await deps.sumarUsoSiHayCupo(userId, ventana, periodo, limite);
      if (usados === null) {
        const renueva = renovacionDelCupo(ventana, ahora);
        return {
          permitido: false,
          plan,
          ventana,
          usados: limite,
          limite,
          renueva,
          mensaje: mensajeDeCupoAgotado(plan, limite, renueva),
        };
      }

      return {
        permitido: true,
        plan,
        devolver: async () => {
          try {
            await deps.restarUso(userId, ventana, periodo);
          } catch (err) {
            log.error("cupo.errorAlDevolver", { uid: firebaseUid, detail: mensajeDeError(err) });
          }
        },
      };
    } catch (err) {
      log.error("cupo.errorDb", { uid: firebaseUid, detail: mensajeDeError(err) });
      return { permitido: true, plan: "gratuito", devolver: SIN_COSTO };
    }
  };
}

export const consumirCupo = crearControlDeCupo({
  getPlan: getPlanDelUsuario,
  sumarUsoSiHayCupo,
  restarUso,
});

/** Cuerpo de la respuesta 429 cuando se agotó el cupo (del día o del mes, según el plan). */
export function respuestaCupoAgotado(r: Extract<ResultadoCupo, { permitido: false }>) {
  return {
    error: r.mensaje,
    code: "cupo_agotado",
    plan: r.plan,
    ventana: r.ventana,
    usados: r.usados,
    limite: r.limite,
    renueva: r.renueva,
  };
}
