/**
 * Números del plan pago: el ÚNICO lugar a tocar cuando cambien.
 *
 * Gemini 3 cobra cada búsqueda con grounding, así que cada análisis nuevo tiene costo
 * real: el cupo gratis tiene que ser chico y "ilimitado" no se sostiene.
 *
 *   Gratuito  5 por DÍA (decisión de Renzo, 19-nov-2026): alcanza para chequear lo que
 *             llega en el día y se renueva cada medianoche, en vez de agotarse a mitad de mes.
 *   Premium   300 por MES de uso justo: alto para una persona pero acotado en plata. Un
 *             tope diario alto dejaría a un usuario intensivo costar más de lo que paga.
 *
 * Si cambia algo de acá, revisar también apps/lib/plan.ts (espejo para la landing), los
 * textos de apps/components/planes.tsx y docs/negocio/viabilidad-comercial.md.
 */
export type Ventana = "dia" | "mes";

export const CUPOS = {
  gratuito: { limite: 5, ventana: "dia" },
  premium: { limite: 300, ventana: "mes" },
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
