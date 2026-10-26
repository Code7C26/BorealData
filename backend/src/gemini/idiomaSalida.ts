import type { AnalysisResult, Language } from "./types.js";

/**
 * Red de seguridad del idioma del análisis.
 *
 * El prompt ya pide cada campo en el idioma de la persona (ver buildPrompt), pero el
 * modelo no siempre obedece: con una nota en castellano pedida en inglés, Gemini llegó a
 * escribir `headline` y `lead` en castellano y el resto en inglés (medido en uso real,
 * 22-oct-2026). Lo que se ve primero en la card es justo el titular, así que no alcanza
 * con "casi siempre".
 *
 * Por eso, después de parsear: si se pidió inglés y algún campo de texto sigue en
 * castellano, se traducen SOLO esos campos con una segunda llamada, corta y sin búsqueda.
 * En el caso normal no hay segunda llamada. Si la traducción falla, queda el análisis
 * como vino: un titular en el idioma equivocado es mejor que perder el análisis entero.
 *
 * Hoy solo cubre el inglés: pedir castellano y recibir inglés no se vio nunca, porque el
 * prompt entero está en castellano.
 */

// Palabras que en un texto en inglés prácticamente no aparecen, y al revés. Quedan
// afuera las ambiguas ("a", "no", "de" — que vive en nombres propios como "Universidad de
// Oslo" aunque la frase esté en inglés).
const MARCAS_CASTELLANO = new Set([
  "el", "la", "los", "las", "del", "al", "que", "y", "en", "es", "son", "se", "su", "sus",
  "lo", "para", "por", "con", "una", "según", "sobre", "fue", "como", "más", "entre",
  "pero", "también", "está", "están", "sin", "ningún", "ninguna", "nota", "artículo",
]);
const MARCAS_INGLES = new Set([
  "the", "and", "of", "to", "for", "with", "that", "was", "were", "is", "are", "from",
  "by", "on", "this", "which", "has", "have", "not", "article", "its", "it", "be", "as",
]);

/** ¿Este texto está (mayormente) en castellano? Pensado para frases cortas del análisis. */
export function pareceCastellano(texto: string): boolean {
  const palabras = texto.toLowerCase().match(/[a-záéíóúñü]+/g) ?? [];
  let es = 0;
  let en = 0;
  for (const palabra of palabras) {
    if (MARCAS_CASTELLANO.has(palabra)) es++;
    else if (MARCAS_INGLES.has(palabra)) en++;
  }
  return es >= 2 && es > en;
}

/** Los textos del análisis que escribe el modelo, con una clave plana por cada uno. */
function textosDelAnalisis(result: AnalysisResult): Record<string, string> {
  const textos: Record<string, string> = {
    headline: result.headline,
    lead: result.lead,
    summary: result.summary,
  };
  result.reasoning.forEach((paso, i) => (textos[`reasoning.${i}`] = paso));
  result.sources.forEach((fuente, i) => (textos[`sources.${i}.note`] = fuente.note));
  result.toneFlags.forEach((flag, i) => (textos[`toneFlags.${i}`] = flag));
  return textos;
}

function aplicarTraduccion(result: AnalysisResult, traducidos: Record<string, string>): AnalysisResult {
  const tomar = (clave: string, actual: string) => {
    const nuevo = traducidos[clave];
    return typeof nuevo === "string" && nuevo.trim().length > 0 ? nuevo.trim() : actual;
  };
  return {
    ...result,
    headline: tomar("headline", result.headline),
    lead: tomar("lead", result.lead),
    summary: tomar("summary", result.summary),
    reasoning: result.reasoning.map((paso, i) => tomar(`reasoning.${i}`, paso)),
    sources: result.sources.map((fuente, i) => ({ ...fuente, note: tomar(`sources.${i}.note`, fuente.note) })),
    toneFlags: result.toneFlags.map((flag, i) => tomar(`toneFlags.${i}`, flag)),
  };
}

/** Traduce un mapa clave → texto y devuelve el mismo mapa traducido (o null si falló). */
export type Traductor = (textos: Record<string, string>) => Promise<Record<string, string> | null>;

/**
 * Devuelve el análisis con todos sus textos en `language`. Solo llama a `traducir` si
 * encontró algún campo en el idioma equivocado, y le manda solo esos.
 */
export async function asegurarIdioma(
  result: AnalysisResult,
  language: Language,
  traducir: Traductor
): Promise<{ result: AnalysisResult; corregidos: string[] }> {
  if (language !== "en" || !result.success) return { result, corregidos: [] };

  const equivocados = Object.fromEntries(
    Object.entries(textosDelAnalisis(result)).filter(([, texto]) => texto && pareceCastellano(texto))
  );
  const claves = Object.keys(equivocados);
  if (claves.length === 0) return { result, corregidos: [] };

  try {
    const traducidos = await traducir(equivocados);
    if (!traducidos) return { result, corregidos: [] };
    return { result: aplicarTraduccion(result, traducidos), corregidos: claves };
  } catch {
    return { result, corregidos: [] };
  }
}

/** El pedido de la segunda llamada. Va entero en inglés: es lo que tiene que devolver. */
export function buildTranslationPrompt(textos: Record<string, string>): string {
  return `Translate every value of this JSON object from Spanish into natural, neutral English. Keep the same keys. Keep proper nouns, names of people and institutions, figures and dates exactly as they are. Do not add, remove or summarize information. Reply with the JSON object only.

${JSON.stringify(textos, null, 2)}`;
}
