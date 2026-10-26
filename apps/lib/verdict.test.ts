import { describe, expect, it } from 'vitest'
import {
  CONFIDENCE,
  CONFIDENCE_RANGE,
  isConfidence,
  isSourceStance,
  isVerdict,
  normalize,
  SOURCE_STANCES,
  STANCE,
  VERDICT,
  VERDICTS,
  VOCABULARIO,
  type Confidence,
} from './verdict'

const NIVELES: Confidence[] = [1, 2, 3, 4, 5]

/**
 * `verdict.ts` es el espejo en el front de backend/src/gemini/types.ts. El riesgo real no
 * es que una de las dos esté mal: es que se separen sin que nadie lo note, porque el
 * backend ya normaliza y entonces el front casi nunca ve una combinación inválida. Estos
 * tests fijan la tabla del lado del front para que un cambio en una sola de las dos
 * puntas rompa algo.
 */
describe('normalize', () => {
  it('deja intacta toda combinación dentro de tabla', () => {
    for (const verdict of VERDICTS) {
      const { min, max } = CONFIDENCE_RANGE[verdict]
      for (const confidence of NIVELES) {
        if (confidence < min || confidence > max) continue
        expect(normalize(verdict, confidence)).toEqual({ verdict, confidence })
      }
    }
  })

  it('degrada a sin-datos toda combinación fuera de tabla', () => {
    for (const verdict of VERDICTS) {
      const { min, max } = CONFIDENCE_RANGE[verdict]
      for (const confidence of NIVELES) {
        if (confidence >= min && confidence <= max) continue
        expect(normalize(verdict, confidence).verdict).toBe('sin-datos')
      }
    }
  })

  it('el resultado siempre respeta el rango de su propio veredicto', () => {
    for (const verdict of VERDICTS) {
      for (const confidence of NIVELES) {
        const r = normalize(verdict, confidence)
        const { min, max } = CONFIDENCE_RANGE[r.verdict]
        expect(r.confidence).toBeGreaterThanOrEqual(min)
        expect(r.confidence).toBeLessThanOrEqual(max)
      }
    }
  })

  /**
   * A diferencia del backend, normalize() recibe `unknown`: lo que llega de la API o de
   * sessionStorage puede ser cualquier cosa (una fila vieja, un JSON a medio migrar).
   */
  it('cae a sin-datos / 1 con datos basura, sin tirar excepción', () => {
    for (const basura of [
      [undefined, undefined],
      [null, 3],
      ['probable', 4],
      ['verificado', 0],
      ['verificado', 6],
      ['verificado', 3.5],
      ['verificado', '4'],
      [42, 42],
      [{}, []],
    ] as const) {
      expect(normalize(basura[0], basura[1])).toEqual({ verdict: 'sin-datos', confidence: 1 })
    }
  })

  it('un score viejo 0-100 no se cuela como nivel de confianza', () => {
    expect(normalize('verificado', 72)).toEqual({ verdict: 'sin-datos', confidence: 1 })
  })
})

describe('guardas de tipo', () => {
  it('isVerdict acepta los cuatro y nada más', () => {
    for (const v of VERDICTS) expect(isVerdict(v)).toBe(true)
    for (const v of ['VERIFICADO', 'probable', '', null, undefined, 3]) {
      expect(isVerdict(v)).toBe(false)
    }
  })

  it('isConfidence acepta solo enteros de 1 a 5', () => {
    for (const n of NIVELES) expect(isConfidence(n)).toBe(true)
    for (const n of [0, 6, -1, 2.5, '3', null, undefined, NaN, Infinity]) {
      expect(isConfidence(n)).toBe(false)
    }
  })

  it('isSourceStance acepta solo las cuatro posturas', () => {
    for (const s of SOURCE_STANCES) expect(isSourceStance(s)).toBe(true)
    for (const s of ['respalda', 'neutral_relacionada', '', null]) {
      expect(isSourceStance(s)).toBe(false)
    }
  })
})

describe('vocabulario completo', () => {
  it('cada veredicto tiene todas sus clases y su significado', () => {
    for (const v of VERDICTS) {
      const meta = VERDICT[v]
      expect(meta.label.length, v).toBeGreaterThan(0)
      expect(meta.meaning.length, v).toBeGreaterThan(0)
      for (const clase of [meta.text, meta.bg, meta.borderTop, meta.borderLeft]) {
        expect(clase.length, `${v}: ${clase}`).toBeGreaterThan(0)
      }
    }
  })

  /**
   * Tailwind v4 escanea el código fuente, así que una clase armada en runtime
   * (`borderTop.replace('border-t-', 'border-l-')`) nunca se genera y el borde queda
   * sin color. Ya pasó una vez. Por eso borderLeft existe como campo propio, y este
   * test verifica que de verdad sea el par correcto y esté escrito entero.
   */
  it('borderLeft es el par de borderTop, escrito entero y no derivado', () => {
    for (const v of VERDICTS) {
      const { borderTop, borderLeft } = VERDICT[v]
      expect(borderTop, v).toMatch(/^border-t-/)
      expect(borderLeft, v).toMatch(/^border-l-/)
      expect(borderLeft.replace('border-l-', ''), v).toBe(borderTop.replace('border-t-', ''))
    }
  })

  it('los cinco niveles de confianza tienen etiqueta', () => {
    for (const n of NIVELES) expect(CONFIDENCE[n].label.length, String(n)).toBeGreaterThan(0)
  })

  it('las cuatro posturas de fuente tienen etiqueta', () => {
    for (const s of SOURCE_STANCES) expect(STANCE[s].label.length, s).toBeGreaterThan(0)
  })
})

/**
 * El inglés hereda las clases del español con un spread. Si alguien reescribe una entrada
 * a mano y se le escapa una clase, el chip en inglés sale sin color: esto lo frena.
 */
describe('vocabulario en inglés', () => {
  it('traduce las etiquetas pero conserva las mismas clases e íconos', () => {
    const es = VOCABULARIO.es
    const en = VOCABULARIO.en
    for (const v of VERDICTS) {
      expect(en.VERDICT[v].label, v).not.toBe(es.VERDICT[v].label)
      expect(en.VERDICT[v].meaning.length, v).toBeGreaterThan(0)
      for (const campo of ['icon', 'text', 'bg', 'borderTop', 'borderLeft'] as const) {
        expect(en.VERDICT[v][campo], `${v}.${campo}`).toBe(es.VERDICT[v][campo])
      }
    }
    for (const n of NIVELES) expect(en.CONFIDENCE[n].label.length, String(n)).toBeGreaterThan(0)
    for (const s of SOURCE_STANCES) {
      expect(en.STANCE[s].label, s).not.toBe(es.STANCE[s].label)
      expect(en.STANCE[s].text, s).toBe(es.STANCE[s].text)
    }
  })
})
