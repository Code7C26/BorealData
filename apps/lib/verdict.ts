import { AlertTriangle, CheckCircle2, HelpCircle, XCircle, type LucideIcon } from 'lucide-react'

/**
 * Vocabulario del veredicto — la única fuente de verdad del front.
 *
 * Reemplaza al porcentaje de veracidad: cuatro etiquetas cerradas y cinco
 * escalones de confianza. Un "72 %" comunicaba una precisión decimal que el
 * análisis no tiene; cinco segmentos comunican orden de magnitud sin fingirla.
 *
 * Debe seguir en espejo con backend/src/gemini/types.ts.
 */

export type Verdict = 'verificado' | 'dudoso' | 'falso' | 'sin-datos'
export type Confidence = 1 | 2 | 3 | 4 | 5

export const VERDICT: Record<
  Verdict,
  {
    /** La etiqueta del chip. Nunca aparece en el titular. */
    label: string
    icon: LucideIcon
    /** Qué dice el color, para el `aria-label` y las leyendas. */
    meaning: string
    min: Confidence
    max: Confidence
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
> = {
  verificado: {
    label: 'Verificado',
    icon: CheckCircle2,
    meaning: 'Las fuentes primarias concuerdan.',
    min: 3,
    max: 5,
    text: 'text-verdict-verificado',
    bg: 'bg-verdict-verificado',
    borderTop: 'border-t-verdict-verificado',
    borderLeft: 'border-l-verdict-verificado',
  },
  dudoso: {
    label: 'Dudoso',
    icon: AlertTriangle,
    meaning: 'Mezcla de datos ciertos y descontextualizados.',
    min: 2,
    max: 4,
    text: 'text-verdict-dudoso',
    bg: 'bg-verdict-dudoso',
    borderTop: 'border-t-verdict-dudoso',
    borderLeft: 'border-l-verdict-dudoso',
  },
  falso: {
    label: 'Falso',
    icon: XCircle,
    meaning: 'La evidencia contradice la afirmación central.',
    min: 3,
    max: 5,
    text: 'text-verdict-falso',
    bg: 'bg-verdict-falso',
    borderTop: 'border-t-verdict-falso',
    borderLeft: 'border-l-verdict-falso',
  },
  'sin-datos': {
    label: 'Sin datos suficientes',
    icon: HelpCircle,
    meaning: 'No saber no es un error.',
    min: 1,
    max: 2,
    text: 'text-verdict-sindatos',
    bg: 'bg-verdict-sindatos',
    borderTop: 'border-t-verdict-sindatos',
    borderLeft: 'border-l-verdict-sindatos',
  },
}

/**
 * Única fuente de verdad de la escala: la etiqueta y la nota salen del MISMO
 * nivel. (En la V1 la etiqueta salía del nivel y la nota del veredicto, así que
 * podían decir "Muy alta" y "Alta" a la vez. El veredicto ahora solo aporta el
 * titular y el color.)
 */
export const CONFIDENCE: Record<Confidence, { label: string; note: string }> = {
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
 * análisis viejos o para una respuesta manipulada en el camino.
 */
export function normalize(verdict: Verdict, confidence: Confidence) {
  const range = VERDICT[verdict]
  if (!range) {
    return { verdict: 'sin-datos' as Verdict, confidence: 1 as Confidence }
  }
  if (confidence < range.min || confidence > range.max) {
    return {
      verdict: 'sin-datos' as Verdict,
      confidence: Math.min(confidence, 2) as Confidence,
    }
  }
  return { verdict, confidence }
}

/** Postura de una fuente respecto a la afirmación central. */
export type SourceStance = 'confirma' | 'contradice' | 'sin-datos' | 'origen'

export const STANCE: Record<SourceStance, { label: string; text: string }> = {
  confirma: { label: 'Confirma', text: 'text-verdict-verificado' },
  contradice: { label: 'Contradice', text: 'text-verdict-falso' },
  'sin-datos': { label: 'Sin datos', text: 'text-verdict-sindatos' },
  origen: { label: 'Origen', text: 'text-accent-text' },
}
