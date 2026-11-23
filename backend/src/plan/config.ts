/**
 * Números del plan pago: el ÚNICO lugar a tocar cuando cambien.
 *
 * Gemini 3 cobra cada búsqueda con grounding, así que cada análisis nuevo tiene costo
 * real: el cupo gratis tiene que ser chico y "ilimitado" no se sostiene.
 *
 *   Gratuito  5 por DÍA (decisión de Renzo, 19-nov-2026): alcanza para chequear lo que
 *             llega en el día y se renueva cada medianoche, en vez de agotarse a mitad de mes.
 *   Premium   150 por MES de uso justo: alto para una persona pero acotado en plata. Un
 *             tope diario alto dejaría a un usuario intensivo costar más de lo que paga.
 *
 * Por qué 150 (medido el 23-nov-2026 con el prompt de producción): cada análisis cuesta
 * ≈ $21 si las búsquedas entran en las 5.000 gratis del mes y ≈ $40 si se pagan; desde el
 * 1-ene-2027 Google duplica el precio de los tokens ($43–61). Con $6.999, 300 por mes
 * dejaba pérdida en 2027; 150 entra en el precio en casi todos los escenarios.
 *
 * Si cambia algo de acá, revisar también apps/lib/plan.ts (espejo para la landing), los
 * textos de apps/components/planes.tsx y docs/negocio/viabilidad-comercial.md.
 */
export type Ventana = "dia" | "mes";

export const CUPOS = {
  gratuito: { limite: 5, ventana: "dia" },
  premium: { limite: 150, ventana: "mes" },
} as const satisfies Record<string, { limite: number; ventana: Ventana }>;

export type Plan = keyof typeof CUPOS;

/** Precio de Premium por mes, en pesos. Espejo de PRECIOS en apps/components/planes.tsx. */
export const PRECIO_PREMIUM_ARS = 6999;

/** Días corridos desde la contratación en los que vale el botón de arrepentimiento. */
export const DIAS_ARREPENTIMIENTO = 10;

/**
 * Días de margen después de la fecha del próximo cobro antes de bajar la cuenta sola: el
 * cobro de Mercado Pago y su webhook pueden llegar un rato después de la fecha.
 */
export const DIAS_DE_GRACIA = 3;

/** El día y el mes del cupo se cuentan en hora argentina: medianoche de acá, no de Londres. */
export const ZONA_HORARIA = "America/Argentina/Buenos_Aires";
