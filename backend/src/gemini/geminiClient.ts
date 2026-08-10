import { GoogleGenAI } from "@google/genai";
import type { AnalysisResult, GeminiOptions, VeracityLabel } from "./types.js";

const DEFAULT_MODEL = "gemini-2.5-flash";
const DEFAULT_MAX_INPUT_CHARS = 12000;

const VALID_LABELS: VeracityLabel[] = [
  "verdadero",
  "mayormente_verdadero",
  "mixto",
  "mayormente_falso",
  "falso",
  "no_verificable",
];

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

function buildPrompt(title: string, text: string): string {
  return `Sos un analista experto en verificación de noticias (fact-checking) y detección de desinformación.

Vas a recibir el título y el cuerpo de un artículo periodístico. Tu tarea es evaluar su VERACIDAD.

REGLA CRÍTICA SOBRE FECHAS Y HECHOS RECIENTES:
Tu conocimiento de entrenamiento tiene una fecha de corte, y esta noticia puede ser posterior a esa fecha. NUNCA califiques algo como falso solo porque contradice lo último que sabías sobre una persona o situación (por ejemplo: alguien que figuraba con vida en tu conocimiento previo puede haber fallecido después de tu corte; un cargo, un resultado o un estado pueden haber cambiado). Antes de asumir que un hecho es falso por esa razón, USÁ LA BÚSQUEDA WEB para verificar el estado actual de la información. Un artículo que reporta un evento reciente real (una muerte, una elección, un resultado deportivo, etc.) NO es falso simplemente por ser posterior a tu conocimiento interno. Verificá con la búsqueda antes de penalizar.

Usá la búsqueda web para:
- Confirmar si los hechos centrales del artículo ocurrieron y coinciden con otras fuentes.
- Verificar nombres, fechas, cifras y citas cuando sea razonable dudar de ellos.
- Contrastar con cobertura de medios reconocidos cuando el tema lo amerite.

Analizá estas dos dimensiones:

1. VERACIDAD DEL CONTENIDO: ¿las afirmaciones son verificables y consistentes con fuentes actuales (no solo con tu conocimiento previo)? ¿hay contradicciones internas, afirmaciones extraordinarias sin evidencia, o datos falsos/engañosos confirmados por la búsqueda?

2. TONO Y ESTILO DE REDACCIÓN (señal adicional, no determinante por sí sola): lenguaje sensacionalista, uso excesivo de MAYÚSCULAS, exclamaciones múltiples, títulos tipo clickbait, apelación emocional desproporcionada, ausencia de fuentes citadas, generalizaciones sin sustento.

Cuando termines de razonar y buscar, devolvé tu respuesta final como un objeto JSON en un bloque de código, y nada más después de ese bloque. Formato exacto:
\`\`\`json
{
  "score": <número entero de 0 a 100, donde 100 es totalmente veraz y 0 es totalmente falso>,
  "label": "<una de: verdadero | mayormente_verdadero | mixto | mayormente_falso | falso | no_verificable>",
  "explanation": "<2 a 4 oraciones explicando el porqué del score, mencionando si se verificó con búsqueda web, en español, tono neutral>",
  "toneFlags": ["<lista corta de señales de tono detectadas, vacía si no hay ninguna>"]
}
\`\`\`

Usá "no_verificable" solo si el texto no tiene contenido suficiente para evaluar, o si la búsqueda no arroja información suficiente para confirmar ni desmentir los hechos centrales.

Título del artículo:
${title || "(sin título)"}

Cuerpo del artículo:
${text}`;
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
  const truncatedText =
    text.length > maxInputChars ? text.slice(0, maxInputChars) : text;

  try {
    const ai = getClient();

    const response = await ai.models.generateContent({
      model,
      contents: buildPrompt(title, truncatedText),
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const raw = response.text;
    if (!raw) {
      return {
        score: 0,
        label: "no_verificable",
        explanation: "",
        toneFlags: [],
        success: false,
        error: "Gemini no devolvió texto en la respuesta.",
      };
    }

    return parseGeminiResponse(raw);
  } catch (err) {
    return {
      score: 0,
      label: "no_verificable",
      explanation: "",
      toneFlags: [],
      success: false,
      error: err instanceof Error ? err.message : "Error desconocido llamando a Gemini.",
    };
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
 */
export function parseGeminiResponse(raw: string): AnalysisResult {
  const jsonSnippet = extractJsonBlock(raw);

  let parsed: unknown;

  try {
    parsed = JSON.parse(jsonSnippet);
  } catch {
    return {
      score: 0,
      label: "no_verificable",
      explanation: "",
      toneFlags: [],
      success: false,
      error: "La respuesta de Gemini no es JSON válido.",
    };
  }

  if (typeof parsed !== "object" || parsed === null) {
    return {
      score: 0,
      label: "no_verificable",
      explanation: "",
      toneFlags: [],
      success: false,
      error: "La respuesta de Gemini no tiene forma de objeto.",
    };
  }

  const obj = parsed as Record<string, unknown>;

  const score =
    typeof obj.score === "number" ? Math.min(100, Math.max(0, Math.round(obj.score))) : null;
  const label =
    typeof obj.label === "string" && VALID_LABELS.includes(obj.label as VeracityLabel)
      ? (obj.label as VeracityLabel)
      : null;
  const explanation = typeof obj.explanation === "string" ? obj.explanation : null;
  const toneFlags = Array.isArray(obj.toneFlags)
    ? obj.toneFlags.filter((f): f is string => typeof f === "string")
    : [];

  if (score === null || label === null || explanation === null) {
    return {
      score: 0,
      label: "no_verificable",
      explanation: "",
      toneFlags: [],
      success: false,
      error: "La respuesta de Gemini no tiene los campos esperados (score, label, explanation).",
    };
  }

  return {
    score,
    label,
    explanation,
    toneFlags,
    success: true,
  };
}