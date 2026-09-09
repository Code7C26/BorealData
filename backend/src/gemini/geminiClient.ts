import { GoogleGenAI } from "@google/genai";
import type {
  AnalysisResult,
  AnalysisSource,
  GeminiOptions,
  SourceStance,
  VeracityLabel,
} from "./types.js";

const DEFAULT_MODEL = "gemini-2.5-flash";
const DEFAULT_MAX_INPUT_CHARS = 12000;
const DEFAULT_TIMEOUT_MS = 180_000;

const VALID_LABELS: VeracityLabel[] = [
  "verdadero",
  "mayormente_verdadero",
  "mixto",
  "mayormente_falso",
  "falso",
  "no_verificable",
];

const VALID_STANCES: SourceStance[] = ["respalda", "contradice", "neutral_relacionada"];

let client: GoogleGenAI | null = null;

/**
 * Instancia el cliente de Gemini de forma perezosa (lazy), para no romper
 * el arranque del server si GEMINI_API_KEY todavía no está seteada en .env.
 */
function getClient(): GoogleGenAI {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "GEMINI_API_KEY no está definida en las variables de entorno."
      );
    }
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

/** Arma un AnalysisResult de error, con todos los campos "vacíos" del contrato completos. */
function errorResult(error: string): AnalysisResult {
  return {
    score: 0,
    label: "no_verificable",
    summary: "",
    explanation: "",
    claimVsEvidence: "",
    sources: [],
    toneFlags: [],
    success: false,
    error,
  };
}

function buildPrompt(title: string, text: string): string {
  return `Sos un analista experto en verificación de noticias (fact-checking) y detección de desinformación.

Vas a recibir el título y el cuerpo de un artículo periodístico. Tu tarea es evaluar su VERACIDAD.

REGLA CRÍTICA SOBRE FECHAS Y HECHOS RECIENTES:
Tu conocimiento de entrenamiento tiene una fecha de corte, y esta noticia puede ser posterior a esa fecha. NUNCA califiques algo como falso solo porque contradice lo último que sabías sobre una persona o situación (por ejemplo: alguien que figuraba con vida en tu conocimiento previo puede haber fallecido después de tu corte; un cargo, un resultado o un estado pueden haber cambiado). Antes de asumir que un hecho es falso por esa razón, USÁ LA BÚSQUEDA WEB para verificar el estado actual de la información. Un artículo que reporta un evento reciente real (una muerte, una elección, un resultado deportivo, etc.) NO es falso simplemente por ser posterior a tu conocimiento interno. Verificá con la búsqueda antes de penalizar.

Usá la búsqueda web para:
- Confirmar si los hechos centrales del artículo ocurrieron y coinciden con otras fuentes.
- Verificar nombres, fechas, cifras y citas cuando sea razonable dudar de ellos.
- Contrastar con cobertura de medios reconocidos cuando el tema lo amerite.

Analizá estas dimensiones:

1. VERACIDAD DEL CONTENIDO: ¿las afirmaciones son verificables y consistentes con fuentes actuales (no solo con tu conocimiento previo)? ¿hay contradicciones internas, afirmaciones extraordinarias sin evidencia, o datos falsos/engañosos confirmados por la búsqueda?

2. TONO Y ESTILO DE REDACCIÓN (señal adicional, no determinante por sí sola): lenguaje sensacionalista, uso excesivo de MAYÚSCULAS, exclamaciones múltiples, títulos tipo clickbait, apelación emocional desproporcionada, ausencia de fuentes citadas, generalizaciones sin sustento.

3. AFIRMACIÓN VS. EVIDENCIA: identificá la afirmación central del artículo y compará explícitamente qué dice el artículo contra qué dice la evidencia que encontraste (búsqueda web o el propio texto si es autoconsistente).

4. FUENTES: por cada fuente relevante que hayas consultado en la búsqueda web, indicá su título, y si RESPALDA, CONTRADICE, o es solo NEUTRAL/RELACIONADA respecto de la afirmación central del artículo (no confirma ni desmiente directamente, pero da contexto). Si el veredicto se basó en el análisis del propio texto sin necesitar búsqueda externa (por ejemplo, una contradicción lógica interna evidente, o un tema trivial y autoevidente), indicá igual una entrada explicando eso en vez de dejar la lista vacía.

Cuando termines de razonar y buscar, devolvé tu respuesta final como un objeto JSON en un bloque de código, y nada más después de ese bloque. Formato exacto:
\`\`\`json
{
  "score": <número entero de 0 a 100, donde 100 es totalmente veraz y 0 es totalmente falso>,
  "label": "<una de: verdadero | mayormente_verdadero | mixto | mayormente_falso | falso | no_verificable>",
  "summary": "<2 a 3 oraciones resumiendo de qué trata la noticia, en español, tono neutral, mostrando que se leyó el contenido real>",
  "explanation": "<2 a 4 oraciones explicando el porqué del score, mencionando si se verificó con búsqueda web, en español, tono neutral>",
  "claimVsEvidence": "<1 a 3 oraciones comparando explícitamente la afirmación central del artículo contra lo que muestra la evidencia encontrada>",
  "sources": [
    {
      "title": "<título de la fuente o página consultada>",
      "stance": "<una de: respalda | contradice | neutral_relacionada>",
      "note": "<1 oración explicando qué aporta esta fuente al veredicto; si no hubo búsqueda externa, explicá que el veredicto salió del análisis del propio texto>"
    }
  ],
  "toneFlags": ["<lista corta de señales de tono detectadas, vacía si no hay ninguna>"]
}
\`\`\`

No incluyas URLs dentro de "sources": el sistema las agrega automáticamente a partir de tu búsqueda real. Solo completá "title", "stance" y "note".

Usá "no_verificable" solo si el texto no tiene contenido suficiente para evaluar, o si la búsqueda no arroja información suficiente para confirmar ni desmentir los hechos centrales.

Título del artículo:
${title || "(sin título)"}

Cuerpo del artículo:
${text}`;
}

/**
 * Fuente cruda tal como la devuelve Gemini en su JSON (sin URL: el modelo no la escribe,
 * para evitar que la alucine). La URL real se agrega después, cruzando con groundingChunks.
 */
interface RawSource {
  title: unknown;
  stance: unknown;
  note: unknown;
}

/**
 * Convierte los groundingChunks crudos de la respuesta de Gemini (fuentes reales que
 * Google Search devolvió) a una lista simple de { title, url }, ignorando chunks sin uri.
 */
function extractGroundingLinks(response: {
  candidates?: Array<{
    groundingMetadata?: {
      groundingChunks?: Array<{ web?: { uri?: string; title?: string } }>;
    };
  }>;
}): Array<{ title: string; url: string }> {
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  return chunks
    .map((chunk) => ({
      title: chunk.web?.title ?? "",
      url: chunk.web?.uri ?? "",
    }))
    .filter((s) => s.url.length > 0);
}

/**
 * Cruza las fuentes que Gemini describió (title/stance/note, sin URL) con los links
 * reales de groundingChunks, matcheando por título. Si no hay match (o no hubo búsqueda),
 * la fuente queda con url: null en vez de inventar un link.
 */
function attachRealUrls(
  rawSources: RawSource[],
  groundingLinks: Array<{ title: string; url: string }>
): AnalysisSource[] {
  const usedUrls = new Set<string>();

  return rawSources
    .filter(
      (s): s is { title: string; stance: string; note: string } =>
        typeof s.title === "string" &&
        typeof s.stance === "string" &&
        VALID_STANCES.includes(s.stance as SourceStance) &&
        typeof s.note === "string"
    )
    .map((s) => {
      // Match simple por similitud de título (case-insensitive, substring en cualquier sentido).
      const match = groundingLinks.find((link) => {
        if (usedUrls.has(link.url)) return false;
        const a = s.title.toLowerCase().trim();
        const b = link.title.toLowerCase().trim();
        return a.length > 0 && b.length > 0 && (a.includes(b) || b.includes(a));
      });

      if (match) {
        usedUrls.add(match.url);
      }

      return {
        title: s.title,
        url: match?.url ?? null,
        stance: s.stance as SourceStance,
        note: s.note,
      };
    });
}

/**
 * Llama a la API de Gemini con el texto ya scrapeado y devuelve el análisis parseado.
 * No hace scraping ni validaciones de negocio: eso vive en analyzeContent.ts.
 */
export async function callGemini(
  title: string,
  text: string,
  options: GeminiOptions = {}
): Promise<AnalysisResult> {
  const model = options.model ?? DEFAULT_MODEL;
  const maxInputChars = options.maxInputChars ?? DEFAULT_MAX_INPUT_CHARS;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const truncatedText =
    text.length > maxInputChars ? text.slice(0, maxInputChars) : text;

  try {
    const ai = getClient();

    // Nota: responseMimeType: "application/json" es incompatible con tools
    // (la API de Gemini devuelve 400 si se combinan, y además si se combinaran
    // groundingChunks/groundingSupports vienen vacíos igual). Por eso el JSON se
    // pide por prompt, envuelto en un bloque ```json, y se extrae en parseGeminiResponse.
    //
    // httpOptions.timeout: el SDK no tiene timeout por default — sin esto, una
    // request que Google nunca responde (visto en la práctica con artículos
    // largos + googleSearch) deja /analyze colgado para siempre.
    const response = await ai.models.generateContent({
      model,
      contents: buildPrompt(title, truncatedText),
      config: {
        tools: [{ googleSearch: {} }],
        httpOptions: { timeout: timeoutMs },
      },
    });

    const raw = response.text;
    if (!raw) {
      return errorResult("Gemini no devolvió texto en la respuesta.");
    }

    const groundingLinks = extractGroundingLinks(response);
    return parseGeminiResponse(raw, groundingLinks);
  } catch (err) {
    return errorResult(
      err instanceof Error ? err.message : "Error desconocido llamando a Gemini."
    );
  }
}

/**
 * Extrae el objeto JSON de la respuesta de texto de Gemini. Sin responseMimeType
 * (no se puede usar junto con tools como googleSearch), el modelo puede devolver
 * razonamiento antes/después y el JSON envuelto en un bloque ```json ... ```.
 * Busca primero ese bloque; si no aparece, cae al primer '{' hasta el último '}'.
 */
function extractJsonBlock(raw: string): string {
  const fencedMatch = raw.match(/```json\s*([\s\S]*?)```/i) ?? raw.match(/```\s*([\s\S]*?)```/);
  if (fencedMatch) {
    return fencedMatch[1].trim();
  }

  const firstBrace = raw.indexOf("{");
  const lastBrace = raw.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return raw.slice(firstBrace, lastBrace + 1);
  }

  return raw;
}

/**
 * Parsea y valida la respuesta cruda de Gemini contra el contrato AnalysisResult.
 * Separado de callGemini para poder testearlo con strings fijos sin pegarle a la API real.
 *
 * groundingLinks es opcional para poder testear con fixtures simples (sin grounding real);
 * en producción siempre viene de extractGroundingLinks().
 */
export function parseGeminiResponse(
  raw: string,
  groundingLinks: Array<{ title: string; url: string }> = []
): AnalysisResult {
  const jsonSnippet = extractJsonBlock(raw);

  let parsed: unknown;

  try {
    parsed = JSON.parse(jsonSnippet);
  } catch {
    return errorResult("La respuesta de Gemini no es JSON válido.");
  }

  if (typeof parsed !== "object" || parsed === null) {
    return errorResult("La respuesta de Gemini no tiene forma de objeto.");
  }

  const obj = parsed as Record<string, unknown>;

  const score =
    typeof obj.score === "number" ? Math.min(100, Math.max(0, Math.round(obj.score))) : null;
  const label =
    typeof obj.label === "string" && VALID_LABELS.includes(obj.label as VeracityLabel)
      ? (obj.label as VeracityLabel)
      : null;
  const summary = typeof obj.summary === "string" ? obj.summary : null;
  const explanation = typeof obj.explanation === "string" ? obj.explanation : null;
  const claimVsEvidence = typeof obj.claimVsEvidence === "string" ? obj.claimVsEvidence : null;
  const toneFlags = Array.isArray(obj.toneFlags)
    ? obj.toneFlags.filter((f): f is string => typeof f === "string")
    : [];
  const rawSources = Array.isArray(obj.sources) ? (obj.sources as RawSource[]) : [];
  const sources = attachRealUrls(rawSources, groundingLinks);

  if (score === null || label === null || summary === null || explanation === null || claimVsEvidence === null) {
    return errorResult(
      "La respuesta de Gemini no tiene los campos esperados (score, label, summary, explanation, claimVsEvidence)."
    );
  }

  return {
    score,
    label,
    summary,
    explanation,
    claimVsEvidence,
    sources,
    toneFlags,
    success: true,
  };
}
