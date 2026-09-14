import { AlertTriangle, CheckCircle2, HelpCircle, XCircle, type LucideIcon } from 'lucide-react'

/**
 * Vocabulario del veredicto — la única fuente de verdad del front.
 *
 * Reemplaza al porcentaje de veracidad: cuatro etiquetas cerradas y cinco
 * escalones de confianza. Un "72 %" comunicaba una precisión decimal que el
 * análisis no tiene; cinco segmentos comunican orden de magnitud sin fingirla.
 *
 * Debe seguir en espejo con backend/src/gemini/types.ts. Lo que tiene que
 * coincidir, literal por literal: los tipos Verdict, Confidence y
 * SourceStance; los valores de CONFIDENCE_RANGE; y el criterio de normalize()
 * (= normalizeVerdict() del backend).
 */

export const VERDICTS = ['verificado', 'dudoso', 'falso', 'sin-datos'] as const
export type Verdict = (typeof VERDICTS)[number]

export type Confidence = 1 | 2 | 3 | 4 | 5

export function isVerdict(value: unknown): value is Verdict {
  return (VERDICTS as readonly unknown[]).includes(value)
}

export function isConfidence(value: unknown): value is Confidence {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 5
}

/**
 * Rango de confianza válido por veredicto. Misma forma y mismos valores que
 * CONFIDENCE_RANGE en backend/src/gemini/types.ts — se puede comparar
 * línea contra línea.
 */
export const CONFIDENCE_RANGE: Record<Verdict, { min: Confidence; max: Confidence }> = {
  verificado: { min: 3, max: 5 },
  dudoso: { min: 2, max: 4 },
  falso: { min: 3, max: 5 },
  'sin-datos': { min: 1, max: 2 },
}

export interface VerdictMeta {
  /** La etiqueta del chip. Nunca aparece en el titular. */
  label: string
  icon: LucideIcon
  /** Qué dice el color, para el `aria-label` y las leyendas. */
  meaning: string
  /**
   * Clases por rol. Los cuatro estados son color + etiqueta, nunca color solo.
   *
   * Van escritas enteras y NO se arman con `.replace()` ni template strings:
   * Tailwind v4 escanea el texto del código fuente, así que una clase
   * construida en runtime (`border-t-` -> `border-l-`) nunca se genera y el
   * borde queda sin color.
   */
  text: string
  bg: string
  borderTop: string
  borderLeft: string
}

export const VERDICT: Record<Verdict, VerdictMeta> = {
  verificado: {
    label: 'Verificado',
    icon: CheckCircle2,
    meaning: 'Las fuentes primarias concuerdan.',
    text: 'text-verdict-verificado',
    bg: 'bg-verdict-verificado',
    borderTop: 'border-t-verdict-verificado',
    borderLeft: 'border-l-verdict-verificado',
  },
  dudoso: {
    label: 'Dudoso',
    icon: AlertTriangle,
    meaning: 'Mezcla de datos ciertos y descontextualizados.',
    text: 'text-verdict-dudoso',
    bg: 'bg-verdict-dudoso',
    borderTop: 'border-t-verdict-dudoso',
    borderLeft: 'border-l-verdict-dudoso',
  },
  falso: {
    label: 'Falso',
    icon: XCircle,
    meaning: 'La evidencia contradice la afirmación central.',
    text: 'text-verdict-falso',
    bg: 'bg-verdict-falso',
    borderTop: 'border-t-verdict-falso',
    borderLeft: 'border-l-verdict-falso',
  },
  'sin-datos': {
    label: 'Sin datos suficientes',
    icon: HelpCircle,
    meaning: 'No saber no es un error.',
    text: 'text-verdict-sindatos',
    bg: 'bg-verdict-sindatos',
    borderTop: 'border-t-verdict-sindatos',
    borderLeft: 'border-l-verdict-sindatos',
  },
}

export interface ConfidenceMeta {
  label: string
  note: string
}

/**
 * Única fuente de verdad de la escala: la etiqueta y la nota salen del MISMO
 * nivel. (En la V1 la etiqueta salía del nivel y la nota del veredicto, así que
 * podían decir "Muy alta" y "Alta" a la vez. El veredicto ahora solo aporta el
 * titular y el color.)
 */
export const CONFIDENCE: Record<Confidence, ConfidenceMeta> = {
  1: {
    label: 'Muy baja',
    note: 'Una sola fuente secundaria y sin confirmación independiente.',
  },
  2: {
    label: 'Baja',
    note: 'Hay indicios, pero falta la fuente primaria.',
  },
  3: {
    label: 'Media',
    note: 'Fuente primaria localizada; queda contexto sin verificar.',
  },
  4: {
    label: 'Alta',
    note: 'Fuente primaria confirmada y coincidencia entre verificadores.',
  },
  5: {
    label: 'Muy alta',
    note: 'Fuente primaria, verificadores independientes y trazabilidad completa.',
  },
}

/**
 * Regla dura: `sin-datos` nunca supera el nivel 2 y `falso`/`verificado` nunca
 * bajan de 3. Si el motor devuelve una combinación fuera de tabla, la UI degrada
 * a `sin-datos` en vez de mostrar una contradicción.
 *
 * El backend ya normaliza antes de guardar; esto es la última defensa para
 * análisis viejos, filas sucias de la DB (confidence null, por ejemplo), o una
 * respuesta manipulada en el camino — por eso recibe `unknown` en vez de
 * `Verdict`/`Confidence` y nunca devuelve NaN.
 */
export function normalize(verdict: unknown, confidence: unknown): { verdict: Verdict; confidence: Confidence } {
  if (!isVerdict(verdict) || !isConfidence(confidence)) {
    return { verdict: 'sin-datos', confidence: 1 }
  }
  const range = CONFIDENCE_RANGE[verdict]
  if (confidence < range.min || confidence > range.max) {
    return {
      verdict: 'sin-datos',
      confidence: Math.min(confidence, 2) as Confidence,
    }
  }
  return { verdict, confidence }
}

export const SOURCE_STANCES = ['confirma', 'contradice', 'sin-datos', 'origen'] as const
/** Postura de una fuente respecto a la afirmación central. */
export type SourceStance = (typeof SOURCE_STANCES)[number]

export function isSourceStance(value: unknown): value is SourceStance {
  return (SOURCE_STANCES as readonly unknown[]).includes(value)
}

export interface StanceMeta {
  label: string
  text: string
}

export const STANCE: Record<SourceStance, StanceMeta> = {
  confirma: { label: 'Confirma', text: 'text-verdict-verificado' },
  contradice: { label: 'Contradice', text: 'text-verdict-falso' },
  'sin-datos': { label: 'Sin datos', text: 'text-verdict-sindatos' },
  origen: { label: 'Origen', text: 'text-accent-text' },
}
