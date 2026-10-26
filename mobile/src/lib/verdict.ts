import { AlertTriangle, CheckCircle2, HelpCircle, XCircle, type LucideIcon } from 'lucide-react-native';

import type { Roles } from '@/theme/tokens';

/**
 * Vocabulario del veredicto — la única fuente de verdad del front móvil.
 *
 * Espejo de `apps/lib/verdict.ts` (web) y de `backend/src/gemini/types.ts`.
 * Lo que tiene que coincidir literal por literal: los tipos Verdict,
 * Confidence y SourceStance; los valores de CONFIDENCE_RANGE; y el criterio de
 * normalize() (= normalizeVerdict() del backend).
 *
 * Única diferencia con la web: allá cada estado carga clases de Tailwind
 * escritas enteras; acá carga el NOMBRE del rol de color (`'verificado'`), que
 * el componente resuelve contra el tema activo. No hay strings de clases que
 * un bundler tenga que descubrir, así que el problema de las clases armadas en
 * runtime no existe de este lado.
 */

export const VERDICTS = ['verificado', 'dudoso', 'falso', 'sin-datos'] as const;
export type Verdict = (typeof VERDICTS)[number];

export type Confidence = 1 | 2 | 3 | 4 | 5;

export function isVerdict(value: unknown): value is Verdict {
  return (VERDICTS as readonly unknown[]).includes(value);
}

export function isConfidence(value: unknown): value is Confidence {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 5;
}

/**
 * Rango de confianza válido por veredicto. Misma forma y mismos valores que
 * CONFIDENCE_RANGE en `backend/src/gemini/types.ts`.
 */
export const CONFIDENCE_RANGE: Record<Verdict, { min: Confidence; max: Confidence }> = {
  verificado: { min: 3, max: 5 },
  dudoso: { min: 2, max: 4 },
  falso: { min: 3, max: 5 },
  'sin-datos': { min: 1, max: 2 },
};

export interface VerdictMeta {
  /** La etiqueta del chip. Nunca aparece en el titular. */
  label: string;
  icon: LucideIcon;
  /** Qué dice el color, para el `accessibilityLabel` y las leyendas. */
  meaning: string;
  /** Rol de color del tema: `c[VERDICT[v].color]`. */
  color: keyof Pick<Roles, 'verificado' | 'dudoso' | 'falso' | 'sindatos'>;
}

export const VERDICT: Record<Verdict, VerdictMeta> = {
  verificado: {
    label: 'Verificado',
    icon: CheckCircle2,
    meaning: 'Las fuentes primarias concuerdan.',
    color: 'verificado',
  },
  dudoso: {
    label: 'Dudoso',
    icon: AlertTriangle,
    meaning: 'Mezcla de datos ciertos y descontextualizados.',
    color: 'dudoso',
  },
  falso: {
    label: 'Falso',
    icon: XCircle,
    meaning: 'La evidencia contradice la afirmación central.',
    color: 'falso',
  },
  'sin-datos': {
    label: 'Sin datos suficientes',
    icon: HelpCircle,
    meaning: 'No saber no es un error.',
    color: 'sindatos',
  },
};

export interface ConfidenceMeta {
  label: string;
  note: string;
}

/**
 * Única fuente de verdad de la escala: la etiqueta y la nota salen del MISMO
 * nivel, así nunca pueden decir "Muy alta" y "Alta" a la vez.
 */
export const CONFIDENCE: Record<Confidence, ConfidenceMeta> = {
  1: { label: 'Muy baja', note: 'Una sola fuente secundaria y sin confirmación independiente.' },
  2: { label: 'Baja', note: 'Hay indicios, pero falta la fuente primaria.' },
  3: { label: 'Media', note: 'Fuente primaria localizada; queda contexto sin verificar.' },
  4: { label: 'Alta', note: 'Fuente primaria confirmada y coincidencia entre verificadores.' },
  5: {
    label: 'Muy alta',
    note: 'Fuente primaria, verificadores independientes y trazabilidad completa.',
  },
};

/**
 * Regla dura: `sin-datos` nunca supera el nivel 2 y `falso`/`verificado` nunca
 * bajan de 3. Si llega una combinación fuera de tabla, la UI degrada a
 * `sin-datos` en vez de mostrar una contradicción.
 *
 * El backend ya normaliza antes de guardar; esto es la última defensa para
 * análisis viejos, filas sucias (confidence null) o una respuesta manipulada en
 * el camino — por eso recibe `unknown` y nunca devuelve NaN.
 */
export function normalize(
  verdict: unknown,
  confidence: unknown,
): { verdict: Verdict; confidence: Confidence } {
  if (!isVerdict(verdict) || !isConfidence(confidence)) {
    return { verdict: 'sin-datos', confidence: 1 };
  }
  const range = CONFIDENCE_RANGE[verdict];
  if (confidence < range.min || confidence > range.max) {
    return { verdict: 'sin-datos', confidence: Math.min(confidence, 2) as Confidence };
  }
  return { verdict, confidence };
}

export const SOURCE_STANCES = ['confirma', 'contradice', 'sin-datos', 'origen'] as const;
/** Postura de una fuente respecto a la afirmación central. */
export type SourceStance = (typeof SOURCE_STANCES)[number];

export function isSourceStance(value: unknown): value is SourceStance {
  return (SOURCE_STANCES as readonly unknown[]).includes(value);
}

export interface StanceMeta {
  label: string;
  /** Rol de color, igual que en VerdictMeta. `'accentText'` para el origen. */
  color: keyof Pick<Roles, 'verificado' | 'falso' | 'sindatos' | 'accentText'>;
}

export const STANCE: Record<SourceStance, StanceMeta> = {
  confirma: { label: 'Confirma', color: 'verificado' },
  contradice: { label: 'Contradice', color: 'falso' },
  'sin-datos': { label: 'Sin datos', color: 'sindatos' },
  origen: { label: 'Origen', color: 'accentText' },
};
