import { CUPOS, DIAS_ARREPENTIMIENTO, ZONA_HORARIA, type Plan, type Ventana } from "./config.js";

/**
 * Lógica pura del plan y del cupo (sin base ni red), para poder probarla sola.
 */

export interface EstadoPlan {
  plan: Plan;
  planDesde: Date | null;
  planHasta: Date | null;
}

/**
 * El plan que vale AHORA. Premium solo mientras `plan_hasta` no venció: si un cobro falla
 * y el webhook de baja nunca llega, la cuenta vuelve sola a gratuito en vez de quedar
 * Premium para siempre.
 */
export function planVigente(estado: EstadoPlan, ahora: Date = new Date()): Plan {
  if (estado.plan !== "premium") return "gratuito";
  if (estado.planHasta && estado.planHasta.getTime() <= ahora.getTime()) return "gratuito";
  return "premium";
}

export function cupoDelPlan(plan: Plan): { limite: number; ventana: Ventana } {
  return CUPOS[plan];
}

/** Año, mes y día de `fecha` en hora argentina. */
function partesEnArgentina(fecha: Date): { anio: number; mes: number; dia: number } {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA_HORARIA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(fecha);
  const valor = (tipo: string) => Number(partes.find((p) => p.type === tipo)?.value);
  return { anio: valor("year"), mes: valor("month"), dia: valor("day") };
}

/** 'YYYY-MM-DD' de una fecha de calendario; Date.UTC normaliza desbordes (32 de dic, mes 13). */
function iso(anio: number, mes: number, dia: number): string {
  return new Date(Date.UTC(anio, mes - 1, dia)).toISOString().slice(0, 10);
}

/**
 * Clave del período del cupo, 'YYYY-MM-DD' en hora argentina: el día de hoy para la
 * ventana diaria, el día 1 del mes para la mensual.
 */
export function periodoDelCupo(ventana: Ventana, fecha: Date = new Date()): string {
  const { anio, mes, dia } = partesEnArgentina(fecha);
  return ventana === "dia" ? iso(anio, mes, dia) : iso(anio, mes, 1);
}

/** Día en que se renueva el cupo, 'YYYY-MM-DD': mañana, o el 1 del mes que viene. */
export function renovacionDelCupo(ventana: Ventana, fecha: Date = new Date()): string {
  const { anio, mes, dia } = partesEnArgentina(fecha);
  return ventana === "dia" ? iso(anio, mes, dia + 1) : iso(anio, mes + 1, 1);
}

/** true si la persona todavía puede usar el botón de arrepentimiento. */
export function puedeArrepentirse(estado: EstadoPlan, ahora: Date = new Date()): boolean {
  if (planVigente(estado, ahora) !== "premium" || !estado.planDesde) return false;
  const limite = estado.planDesde.getTime() + DIAS_ARREPENTIMIENTO * 24 * 60 * 60 * 1000;
  return ahora.getTime() <= limite;
}

/** Nombres de los meses para los mensajes de error en castellano. */
const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

export function mensajeDeCupoAgotado(plan: Plan, limite: number, renueva: string): string {
  if (plan === "premium") {
    const [, mes, dia] = renueva.split("-").map(Number);
    return (
      `Llegaste a los ${limite} análisis de uso justo de Premium de este mes. ` +
      `Se renuevan el ${dia} de ${MESES[mes - 1]}.`
    );
  }
  return (
    `Usaste los ${limite} análisis gratis de hoy. Se renuevan mañana a la medianoche, ` +
    `o pasate a Premium para tener hasta ${CUPOS.premium.limite} por mes.`
  );
}
