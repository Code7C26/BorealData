import { describe, expect, it, vi } from 'vitest'

// lib/api.ts importa Firebase, que en Node no tiene nada que inicializar: acá no se usa.
vi.mock('@/lib/firebase', () => ({ auth: { currentUser: null } }))

const { ApiError } = await import('@/lib/api')
const { destinoTrasEntrar, esCupoAgotado, RUTA_CHECKOUT } = await import('@/lib/plan')

describe('destino después de entrar', () => {
  it('con ?plan=premium sigue al checkout', () => {
    expect(destinoTrasEntrar('?plan=premium')).toBe(RUTA_CHECKOUT)
  })

  it('sin plan, al dashboard de siempre', () => {
    expect(destinoTrasEntrar('')).toBe('/dashboard')
    expect(destinoTrasEntrar('?plan=gratuito')).toBe('/dashboard')
  })
})

describe('cupo agotado', () => {
  it('reconoce el 429 del cupo del plan', () => {
    const err = new ApiError(429, 'Usaste los 5 análisis gratis de hoy.', {
      code: 'cupo_agotado',
      plan: 'gratuito',
      ventana: 'dia',
      usados: 5,
      limite: 5,
      renueva: '2026-11-20',
    })
    expect(esCupoAgotado(err)).toBe(true)
  })

  it('no confunde el límite por hora (429 sin code) con el del plan', () => {
    expect(esCupoAgotado(new ApiError(429, 'Alcanzaste el límite por hora', { error: 'x' }))).toBe(false)
    expect(esCupoAgotado(new Error('red'))).toBe(false)
  })
})
