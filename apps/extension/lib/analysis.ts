/**
 * Tipos y helpers del veredicto — compartidos entre el side panel y el
 * background script. El análisis ahora se dispara y se cachea en
 * background.ts (ver ese archivo) para sobrevivir al cierre del panel al
 * cambiar de pestaña; este módulo es lo que ambos lados necesitan en común.
 *
 * Espejo de backend/src/gemini/types.ts y de apps/lib/verdict.ts en la web.
 *
 * Rediseño V1 (sep-2026): se cayó el `score` 0-100 y los 6 labels viejos.
 * Ahora son cuatro veredictos cerrados y cinco niveles de confianza, que son
 * cosas distintas: el veredicto habla de la nota, la confianza habla de qué
 * tan sólida es la evidencia que conseguimos.
 */
export type Verdict = 'verificado' | 'dudoso' | 'falso' | 'sin-datos';
export type Confidence = 1 | 2 | 3 | 4 | 5;

/** `origen` es donde apareció por primera vez la afirmación. */
export type SourceStance = 'confirma' | 'contradice' | 'sin-datos' | 'origen';

export interface AnalysisSource {
  /** Dominio sin protocolo ni www — es lo que se muestra en la fila. */
  domain: string;
  title: string;
  url?: string;
  stance: SourceStance;
  note: string;
}

export interface AnalysisResult {
  /** Id de la fila guardada: arma el link a /resultado/:id. Falta si no se guardó. */
  id?: string | null;
  verdict: Verdict;
  confidence: Confidence;
  /** Frase en lenguaje natural. Nunca la etiqueta del veredicto. */
  headline: string;
  /** 1 a 2 oraciones con el dato concreto que sostiene el titular. */
  lead: string;
  /** De qué trata la nota (no el veredicto). */
  summary: string;
  /** Los pasos del razonamiento, en orden. */
  reasoning: string[];
  sources: AnalysisSource[];
  /**
   * false cuando el análisis NO tiene página pública en /resultado/:id, aunque
   * haya `id`: es lo que devuelve POST /analyze/content para el contenido que
   * manda el cliente (una captura privada no se le sirve a nadie más, ver
   * getAnalysisById en el backend). El panel esconde "Ver análisis completo"
   * en ese caso: el botón llevaría a una página que no existe.
   */
  shareable?: boolean;
}

/** Respuesta 200 real de POST /analyze (backend/src/routes/analyze.ts). */
export interface BackendAnalyzeResponse {
  id?: string | null;
  url: string;
  title: string;
  verdict: Verdict;
  confidence: Confidence;
  headline: string;
  lead: string;
  summary: string;
  reasoning: string[];
  sources: {
    domain: string;
    title: string;
    url: string | null;
    stance: SourceStance;
    note: string;
  }[];
  toneFlags: string[];
  /** Solo lo manda POST /analyze/content, siempre en false. Ver AnalysisResult.shareable. */
  shareable?: boolean;
}

/**
 * Rango de confianza válido por veredicto. Regla dura del sistema:
 * `sin-datos` nunca supera el nivel 2 y `falso`/`verificado` nunca bajan de 3.
 */
const RANGO: Record<Verdict, { min: Confidence; max: Confidence }> = {
  verificado: { min: 3, max: 5 },
  dudoso: { min: 2, max: 4 },
  falso: { min: 3, max: 5 },
  'sin-datos': { min: 1, max: 2 },
};

/**
 * Degrada una combinación imposible en vez de mostrar una contradicción.
 * El backend ya normaliza antes de guardar; esto es la última defensa del
 * cliente para análisis viejos (cacheados) o una respuesta manipulada en el camino.
 */
export function normalize(verdict: Verdict, confidence: Confidence) {
  const rango = RANGO[verdict];
  if (!rango) return { verdict: 'sin-datos' as Verdict, confidence: 1 as Confidence };
  if (confidence < rango.min || confidence > rango.max) {
    return {
      verdict: 'sin-datos' as Verdict,
      confidence: Math.min(confidence, 2) as Confidence,
    };
  }
  return { verdict, confidence };
}

/** Adapta la respuesta real de POST /analyze al AnalysisResult que renderiza ResultView. */
export function mapBackendResult(data: BackendAnalyzeResponse): AnalysisResult {
  const { verdict, confidence } = normalize(data.verdict, data.confidence);

  return {
    id: data.id ?? null,
    verdict,
    confidence,
    headline: data.headline,
    lead: data.lead,
    summary: data.summary,
    reasoning: data.reasoning ?? [],
    // Solo /analyze/content manda este campo: si no viene, es un análisis de
    // URL y sí tiene página pública.
    shareable: data.shareable !== false,
    sources: (data.sources ?? []).map((source) => ({
      domain: source.domain || source.title,
      title: source.title,
      url: source.url ?? undefined,
      stance: source.stance,
      note: source.note,
    })),
  };
}

// ── Contenido que el scraper no puede ver ──────────────────────────────────
// Espejo de la sección homónima de backend/src/gemini/types.ts. La extensión
// manda la evidencia que el usuario ya tiene delante (una captura de su propia
// pantalla) en vez de una URL que el servidor tendría que ir a buscar y que,
// si es privada, solo le devolvería el muro de login.
// Ver DOCS/BRIEF-captura-contenido-privado.md.

/** Plataformas que el backend reconoce (KNOWN_PLATFORMS). */
export type Platform = 'facebook' | 'instagram' | 'x' | 'whatsapp' | 'tiktok' | 'otro';

/** De dónde salió el contenido. Nunca "url": eso va por POST /analyze. */
export type ClientContentKind = 'capture' | 'selection' | 'image' | 'text';

/** Qué tan legible quedó la imagen, según el propio modelo lector. */
export type ReadingConfidence = 'alta' | 'media' | 'baja';

/**
 * Paso 1 (POST /analyze/read): lo que el modelo LEYÓ de la imagen, sin
 * veredicto. `text` es la transcripción tal cual — el usuario la corrige
 * antes del paso 2, que es justamente lo que sube la calidad del veredicto.
 */
export interface CaptureReading {
  platform: Platform | null;
  author: string | null;
  /** Fecha tal como aparece en el posteo: texto libre ("hace 3 h"). */
  postedAt: string | null;
  text: string;
  /** La afirmación central verificable, o null si no hay ninguna. */
  mainClaim: string | null;
  /** Fuente que el propio posteo cita ("según la OMS…"), si cita alguna. */
  citedSource: string | null;
  /** false si es un meme o una frase sin dato comprobable. */
  hasVerifiableClaim: boolean;
  readingConfidence: ReadingConfidence;
}

/** Respuesta 200 de POST /analyze/read. */
export interface ReadResponse {
  reading: CaptureReading;
}

/**
 * Límites de texto de POST /analyze/content (MIN_TEXT_CHARS / MAX_TEXT_CHARS).
 * Se repiten acá para avisar en el panel antes de gastar el viaje de red.
 */
export const MIN_CONTENT_CHARS = 8;
export const MAX_CONTENT_CHARS = 12_000;

/**
 * Estado del flujo de contenido, compartido entre el panel y background.ts.
 * Vive en background (ver "Análisis de contenido" allá): el panel solo lo
 * renderiza, así que cerrarlo al cambiar de pestaña no pierde el trabajo.
 */
export type ContentJobStatus = 'cropping' | 'reading' | 'review' | 'analyzing' | 'done' | 'error';

export interface ContentJob {
  /** Cambia en cada job nuevo: le permite al panel descartar mensajes viejos. */
  id: string;
  kind: ClientContentKind;
  status: ContentJobStatus;
  /** Solo contexto para el veredicto: el backend NUNCA la scrapea. */
  pageUrl: string | null;
  /** Pista de plataforma sacada del dominio; el modelo puede corregirla. */
  platform: Platform | null;
  /** Etiqueta para el encabezado del panel ("instagram.com"). */
  originLabel: string;
  /**
   * La captura cruda, para previsualizar y recortar. Se borra en cuanto el
   * paso 1 la leyó (ver arriba): es el dato más sensible de todo el flujo.
   */
  captureDataUrl?: string;
  reading?: CaptureReading;
  /** Lo que de verdad se mandó a verificar (la transcripción ya corregida). */
  verifiedText?: string;
  result?: AnalysisResult;
  error?: string;
  /** 'NEEDS_LOGIN' hace que el panel mande a loguearse; el resto solo se muestra. */
  errorCode?: string;
}
