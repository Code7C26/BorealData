import { describe, expect, it } from 'vitest'
import type { AnalysisSource } from './api'
import { separarFuentes } from './fuentes'

const fuente = (parcial: Partial<AnalysisSource>): AnalysisSource => ({
  domain: 'ejemplo.com',
  title: 'Ejemplo',
  url: null,
  stance: 'confirma',
  note: '',
  ...parcial,
})

describe('separarFuentes', () => {
  it('deja con enlace solo las que traen una URL http(s)', () => {
    const { conEnlace, sinEnlace } = separarFuentes([
      fuente({ domain: 'indec.gob.ar', url: 'https://vertexaisearch.cloud.google.com/x' }),
      fuente({ domain: 'chequeado.com', url: null }),
      fuente({ domain: 'raro.com', url: 'javascript:alert(1)' }),
    ])
    expect(conEnlace.map((f) => f.domain)).toEqual(['indec.gob.ar'])
    expect(sinEnlace.map((f) => f.domain)).toEqual(['chequeado.com', 'raro.com'])
    expect(sinEnlace.every((f) => f.url === null)).toBe(true)
  })

  it('mantiene el orden original dentro de cada grupo', () => {
    const { conEnlace, sinEnlace } = separarFuentes([
      fuente({ domain: 'a.com', url: 'https://a.com' }),
      fuente({ domain: 'b.com' }),
      fuente({ domain: 'c.com', url: 'https://c.com' }),
      fuente({ domain: 'd.com' }),
    ])
    expect(conEnlace.map((f) => f.domain)).toEqual(['a.com', 'c.com'])
    expect(sinEnlace.map((f) => f.domain)).toEqual(['b.com', 'd.com'])
  })

  it('el origen sin URL queda con las comprobables y toma la URL de la nota si es el mismo sitio', () => {
    const nota = 'https://www.clarin.com/politica/nota.html'
    const { conEnlace, sinEnlace } = separarFuentes(
      [fuente({ domain: 'clarin.com', stance: 'origen' })],
      nota,
    )
    expect(sinEnlace).toEqual([])
    expect(conEnlace[0].url).toBe(nota)
  })

  it('el origen de otro sitio queda con las comprobables, pero sin inventarle un enlace', () => {
    const { conEnlace } = separarFuentes(
      [fuente({ domain: 'blog-anonimo.net', stance: 'origen' })],
      'https://www.clarin.com/nota',
    )
    expect(conEnlace).toHaveLength(1)
    expect(conEnlace[0].url).toBeNull()
  })

  it('sin URL de nota (texto pegado o captura) no rompe', () => {
    const { conEnlace, sinEnlace } = separarFuentes(
      [fuente({ stance: 'origen' }), fuente({ stance: 'contradice' })],
      '',
    )
    expect(conEnlace).toHaveLength(1)
    expect(sinEnlace).toHaveLength(1)
  })
})
