import { ApiError, apiFetch } from '@/lib/api'

/**
 * Plan pago (Premium con Mercado Pago). Espejo de backend/src/routes/plan.ts y de
 * backend/src/plan/config.ts. Ver docs/tecnico/arquitectura.md, "Plan pago".
 */

export type IdPlan = 'gratuito' | 'premium'

/** Período del cupo: el Gratuito se cuenta por día; Premium, por mes. */
export type Ventana = 'dia' | 'mes'

export interface Cupo {
  limite: number
  ventana: Ventana
}

/**
 * Cupos por plan. El backend manda los suyos en GET /plan (`cupos`), que son los que
 * valen; estos son para la landing, que se ve sin sesión. Si cambian, cambiar los dos
 * (backend/src/plan/config.ts).
 */
export const CUPOS: Record<IdPlan, Cupo> = {
  gratuito: { limite: 5, ventana: 'dia' },
  premium: { limite: 300, ventana: 'mes' },
}

/** Precio de Premium por mes, en pesos. Espejo de PRECIO_PREMIUM_ARS del backend. */
export const PRECIO_PREMIUM_ARS = 6999

/** Respuesta de GET /plan. */
export interface EstadoPlan {
  plan: IdPlan
  planDesde: string | null
  planHasta: string | null
  uso: {
    usados: number
    limite: number
    ventana: Ventana
    /** 'YYYY-MM-DD': hoy, o el día 1 del mes. */
    periodo: string
    /** Día en que se renueva el cupo, 'YYYY-MM-DD'. */
    renueva: string
  }
  cupos: Record<IdPlan, Cupo>
  precio: { monto: number; moneda: string }
  puedeArrepentirse: boolean
  diasArrepentimiento: number
  pagos: { habilitados: boolean; modoPrueba: boolean }
}

export type TipoBaja = 'baja' | 'arrepentimiento'

export interface ResultadoBaja extends EstadoPlan {
  /** Código de la constancia: se le muestra a la persona. */
  codigo: string
  tipo: TipoBaja
  reintegrados: number
  reintegroPendiente: boolean
}

export function obtenerPlan() {
  return apiFetch<EstadoPlan>('/plan')
}

/** Relee la suscripción en Mercado Pago (al volver del checkout). */
export function sincronizarPlan() {
  return apiFetch<EstadoPlan & { suscripcion: { status: string | null } }>('/plan/sincronizar', {
    method: 'POST',
  })
}

/** Crea la suscripción y devuelve el link del checkout de Mercado Pago. */
export async function iniciarCheckout(): Promise<string> {
  const { initPoint } = await apiFetch<{ initPoint: string }>('/plan/suscribir', { method: 'POST' })
  return initPoint
}

export function cancelarPlan(tipo: TipoBaja) {
  return apiFetch<ResultadoBaja>('/plan/cancelar', { method: 'POST', body: { tipo } })
}

/** Botón de baja / arrepentimiento sin sesión: deja la constancia pendiente. */
export function solicitarBajaSinSesion(email: string, tipo: TipoBaja) {
  return apiFetch<{ codigo: string }>('/plan/solicitud', { method: 'POST', body: { email, tipo } })
}

/** Cuerpo del 429 de /analyze y /analyze/content cuando se agotó el cupo del plan. */
export interface CupoAgotado {
  code: 'cupo_agotado'
  plan: IdPlan
  ventana: Ventana
  usados: number
  limite: number
  renueva: string
}

export function esCupoAgotado(err: unknown): err is ApiError & { body: CupoAgotado } {
  return (
    err instanceof ApiError &&
    err.status === 429 &&
    (err.body as { code?: string } | null)?.code === 'cupo_agotado'
  )
}

/**
 * Interruptor para pasar a Premium. En false, ningún botón inicia el pago (landing,
 * "Tu plan" y la redirección al checkout después del registro): Premium se muestra como
 * "Próximamente". Las cuentas que YA son Premium siguen igual, con su cupo y su baja.
 * Apagado para la presentación: Mercado Pago está en modo prueba.
 */
export const PAGOS_PREMIUM_ABIERTOS = false

/** "Tu plan", la pantalla de Configuración. */
export const RUTA_PLAN = '/configuracion/plan'

/** "Empezar con Premium" sin sesión: registro → esta ruta, que abre el checkout sola. */
export const RUTA_CHECKOUT = `${RUTA_PLAN}?suscribir=1`

/**
 * A dónde ir después de entrar o registrarse. Con `?plan=premium` (el botón "Empezar con
 * Premium" de la landing) sigue directo al checkout; si no, al dashboard de siempre.
 * Se lee en el cliente: login y registro son client components.
 */
export function destinoTrasEntrar(search: string): string {
  const quierePremium = new URLSearchParams(search).get('plan') === 'premium'
  return quierePremium && PAGOS_PREMIUM_ABIERTOS ? RUTA_CHECKOUT : '/dashboard'
}

/** destinoTrasEntrar() con la URL actual. Referencia estable para AuthRedirect. */
export function destinoTrasEntrarDesdeUrl(): string {
  return destinoTrasEntrar(typeof window === 'undefined' ? '' : window.location.search)
}
