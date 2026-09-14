"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.domainFromUrl = domainFromUrl;
exports.callGemini = callGemini;
exports.parseGeminiResponse = parseGeminiResponse;
const genai_1 = require("@google/genai");
const types_js_1 = require("./types.js");
const DEFAULT_MODEL = "gemini-2.5-flash";
const DEFAULT_MAX_INPUT_CHARS = 12000;
const DEFAULT_TIMEOUT_MS = 180000;
const VALID_VERDICTS = ["verificado", "dudoso", "falso", "sin-datos"];
const VALID_STANCES = ["confirma", "contradice", "sin-datos", "origen"];
/** Cuántos pasos de razonamiento se piden y se aceptan (la card muestra hasta 5). */
const MIN_REASONING_STEPS = 3;
const MAX_REASONING_STEPS = 5;
let client = null;
/**
 * Instancia el cliente de Gemini de forma perezosa (lazy), para no romper
 * el arranque del server si GEMINI_API_KEY todavía no está seteada en .env.
 */
function getClient() {
    if (!client) {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error("GEMINI_API_KEY no está definida en las variables de entorno.");
        }
        client = new genai_1.GoogleGenAI({ apiKey });
    }
    return client;
}
/** Arma un AnalysisResult de error, con todos los campos "vacíos" del contrato completos. */
function errorResult(error) {
    return {
        verdict: "sin-datos",
        confidence: 1,
        headline: "",
        lead: "",
        summary: "",
        reasoning: [],
        sources: [],
        toneFlags: [],
        success: false,
        error,
    };
}
/** "https://www.uio.no/ritmo/english" -> "uio.no". Devuelve null si no es una URL parseable. */
function domainFromUrl(url) {
    if (!url)
        return null;
    try {
        const host = new URL(url).hostname.toLowerCase();
        return host.startsWith("www.") ? host.slice(4) : host;
    }
    catch {
        return null;
    }
}
// El JSON de respuesta se pide envuelto en un bloque de código markdown. Las comillas
// invertidas van por constante y no inline: el prompt se arma con un template literal,
// y anidar el fence adentro obligaría a escaparlo en cada edición.
const JSON_FENCE = "```json";
const FENCE = "```";
function buildPrompt(title, text) {
    return `Sos el motor de análisis de AletheIA, una herramienta de verificación de noticias. Tu trabajo NO es puntuar: es mostrar el camino completo hasta el veredicto, de forma que cualquiera pueda auditarlo.

Vas a recibir el título y el cuerpo de un artículo periodístico. Tenés que evaluar su afirmación central.

REGLA CRÍTICA SOBRE FECHAS Y HECHOS RECIENTES:
Tu conocimiento de entrenamiento tiene una fecha de corte, y esta noticia puede ser posterior a esa fecha. NUNCA califiques algo como falso solo porque contradice lo último que sabías sobre una persona o situación (por ejemplo: alguien que figuraba con vida en tu conocimiento previo puede haber fallecido después de tu corte; un cargo, un resultado o un estado pueden haber cambiado). Antes de asumir que un hecho es falso por esa razón, USÁ LA BÚSQUEDA WEB para verificar el estado actual de la información. Un artículo que reporta un evento reciente real (una muerte, una elección, un resultado deportivo, etc.) NO es falso simplemente por ser posterior a tu conocimiento interno. Verificá con la búsqueda antes de penalizar.

Usá la búsqueda web para:
- Confirmar si los hechos centrales del artículo ocurrieron y coinciden con otras fuentes.
- Verificar nombres, fechas, cifras y citas cuando sea razonable dudar de ellos.
- Localizar la FUENTE PRIMARIA que el artículo cita (el estudio, el organismo, la institución) y comprobar que exista y diga lo que el artículo afirma.
- Contrastar con verificadores independientes y con cobertura de medios reconocidos.
- Rastrear dónde apareció por primera vez la afirmación, si la nota es parte de una cadena.

EL VEREDICTO — exactamente una de estas cuatro etiquetas:
- "verificado": las fuentes primarias concuerdan con lo que afirma el artículo.
- "dudoso": mezcla de datos ciertos y descontextualizados, o afirmaciones sin respaldo suficiente junto a otras correctas. Es el estado más frecuente y el default razonable cuando dudás.
- "falso": la evidencia contradice la afirmación central, o la fuente que el artículo invoca no existe o no dice eso.
- "sin-datos": no hay información suficiente para afirmar ni desmentir. No saber NO es un error: si la búsqueda no alcanza, este es el veredicto correcto y honesto.

EL NIVEL DE CONFIANZA — un entero de 1 a 5, según qué tan sólida es la evidencia que conseguiste (NO qué tan grave es la noticia):
1 = una sola fuente secundaria y sin confirmación independiente.
2 = hay indicios, pero falta la fuente primaria.
3 = fuente primaria localizada; queda contexto sin verificar.
4 = fuente primaria confirmada y coincidencia entre verificadores.
5 = fuente primaria, verificadores independientes y trazabilidad completa.

COMBINACIONES VÁLIDAS (obligatorio, el sistema descarta el resto):
- "sin-datos" solo puede ir con confianza 1 o 2.
- "dudoso" solo puede ir con confianza 2, 3 o 4.
- "verificado" y "falso" solo pueden ir con confianza 3, 4 o 5. Si no llegaste a la fuente primaria, el veredicto NO es "verificado" ni "falso": es "dudoso" o "sin-datos".

TONO DE VOZ (no negociable):
- Explicá antes de concluir. El razonamiento va primero; el veredicto es su consecuencia.
- Bajá el volumen, subí la evidencia. Sin mayúsculas de grito, sin signos de exclamación, sin la palabra "alerta", sin "cuidado", sin "peligro". El dato solo ya es contundente.
- Hablá del contenido, nunca de quien lo comparte. Cero culpa para quien consulta: nada de "te engañaron", "no caigas", "ojo con lo que compartís".
- Decí qué falta y dónde buscaste; la decisión queda en manos del lector.
- Español rioplatense neutro, sin jerga técnica y sin sermón.

Cuando termines de razonar y buscar, devolvé tu respuesta final como un objeto JSON en un bloque de código, y nada más después de ese bloque. Formato exacto:
${JSON_FENCE}
{
  "verdict": "<una de: verificado | dudoso | falso | sin-datos>",
  "confidence": <entero 1 a 5, respetando las combinaciones válidas de arriba>,
  "headline": "<UNA frase en lenguaje natural que diga qué pasó con LA AFIRMACIÓN CONCRETA de este artículo: tiene que nombrar el hecho, la persona, la cifra o la institución en cuestión. PROHIBIDO usar una frase genérica que podría pegarse sin cambios en cualquier otro artículo con el mismo veredicto (ej: 'no encontramos respaldo para esta afirmación' o 'las fuentes consultadas respaldan la afirmación', dichas así, sin nombrar nada del caso puntual, no sirven). En primera persona del plural. Máximo 90 caracteres. NUNCA la etiqueta del veredicto: no escribas 'Falso', 'Verificado' ni 'Dudoso' acá. Los ejemplos de abajo son solo para calibrar el TONO — no los copies ni los parafrasees de forma genérica, cada headline tiene que estar anclado en el contenido real de ESTA nota: 'No encontramos respaldo para el ascenso salarial que menciona la nota' / 'La cifra de inflación coincide con el dato oficial del INDEC' / 'La nota mezcla la renuncia real de Coxon con una causa que ningún verificador confirmó'>",
  "lead": "<1 a 2 oraciones que sostienen el titular con el dato concreto que lo justifica, nombrando la institución, el verificador o el documento específico>",
  "summary": "<2 a 3 oraciones resumiendo de qué trata la noticia en sí, tono neutral, mostrando que se leyó el contenido real. No es el veredicto>",
  "reasoning": [
    "<paso 1: una oración, el primer eslabón del razonamiento>",
    "<paso 2: una oración>",
    "<paso 3: una oración>"
  ],
  "sources": [
    {
      "domain": "<el dominio de la fuente, sin protocolo ni www, ej: 'uio.no', 'efeverifica.com'>",
      "title": "<título de la página o del medio consultado>",
      "stance": "<una de: confirma | contradice | sin-datos | origen>",
      "note": "<UNA oración corta, máximo 80 caracteres, diciendo qué aporta esta fuente; ej: 'No registra el estudio ni a los autores citados'>"
    }
  ],
  "toneFlags": ["<señales de tono detectadas en el artículo: sensacionalismo, mayúsculas sostenidas, clickbait, apelación emocional, ausencia de fuentes. Lista vacía si no hay ninguna>"]
}
${FENCE}

Reglas de "reasoning": entre ${MIN_REASONING_STEPS} y ${MAX_REASONING_STEPS} pasos, en orden cronológico del análisis, una oración cada uno, sin numerarlos (la numeración la pone la interfaz). Cada paso es un hecho comprobable de tu propio proceso, no una opinión.

Reglas de "sources": listá TODAS las fuentes relevantes, incluso las que contradicen tu veredicto — mostrar la postura de cada una es justamente la diferencia con un puntaje cerrado. Usá "origen" para la publicación donde apareció primero la afirmación y "sin-datos" para la que consultaste sin encontrar información. Si el veredicto salió del análisis del propio texto sin necesitar búsqueda externa (por ejemplo, una contradicción lógica interna evidente), poné igual una entrada explicándolo en vez de dejar la lista vacía.

No incluyas URLs dentro de "sources": el sistema las agrega automáticamente a partir de tu búsqueda real. Solo completá "domain", "title", "stance" y "note".

Título del artículo:
${title || "(sin título)"}

Cuerpo del artículo:
${text}`;
}
/**
 * Convierte los groundingChunks crudos de la respuesta de Gemini (fuentes reales que
 * Google Search devolvió) a una lista simple de { title, url }, ignorando chunks sin uri.
 */
function extractGroundingLinks(response) {
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
    return chunks
        .map((chunk) => ({
        title: chunk.web?.title ?? "",
        url: chunk.web?.uri ?? "",
    }))
        .filter((s) => s.url.length > 0);
}
/** Normaliza lo que el modelo escribió en `domain` para poder compararlo con una URL real. */
function cleanDomain(raw) {
    return raw
        .toLowerCase()
        .trim()
        .replace(/^https?:\/\//, "")
        .replace(/^www\./, "")
        .replace(/\/.*$/, "");
}
/**
 * Cruza las fuentes que Gemini describió (domain/title/stance/note, sin URL) con los links
 * reales de groundingChunks. Matchea por dominio primero (el `title` de un groundingChunk
 * de Google Search suele ser justamente el dominio) y cae al título si no hubo suerte.
 * Sin match — o sin búsqueda — la fuente queda con url: null en vez de inventar un link.
 */
function attachRealUrls(rawSources, groundingLinks) {
    const usedUrls = new Set();
    return rawSources
        .filter((s) => typeof s.domain === "string" &&
        typeof s.title === "string" &&
        typeof s.stance === "string" &&
        VALID_STANCES.includes(s.stance) &&
        typeof s.note === "string")
        .map((s) => {
        const claimedDomain = cleanDomain(s.domain);
        const claimedTitle = s.title.toLowerCase().trim();
        const match = groundingLinks.find((link) => {
            if (usedUrls.has(link.url))
                return false;
            const linkDomain = domainFromUrl(link.url);
            if (claimedDomain.length === 0 || linkDomain === null)
                return false;
            return (linkDomain === claimedDomain ||
                linkDomain.endsWith(`.${claimedDomain}`) ||
                claimedDomain.endsWith(`.${linkDomain}`));
        }) ??
            groundingLinks.find((link) => {
                if (usedUrls.has(link.url))
                    return false;
                const linkTitle = link.title.toLowerCase().trim();
                return (claimedTitle.length > 0 &&
                    linkTitle.length > 0 &&
                    (claimedTitle.includes(linkTitle) || linkTitle.includes(claimedTitle)));
            });
        if (match) {
            usedUrls.add(match.url);
        }
        return {
            // El dominio real de la URL gana sobre el que escribió el modelo: si hubo
            // match, ese es el único dato que no puede estar alucinado.
            domain: domainFromUrl(match?.url) ?? claimedDomain,
            title: s.title,
            url: match?.url ?? null,
            stance: s.stance,
            note: s.note,
        };
    });
}
/**
 * Llama a la API de Gemini con el texto ya scrapeado y devuelve el análisis parseado.
 * No hace scraping ni validaciones de negocio: eso vive en analyzeContent.ts.
 */
async function callGemini(title, text, options = {}) {
    const model = options.model ?? DEFAULT_MODEL;
    const maxInputChars = options.maxInputChars ?? DEFAULT_MAX_INPUT_CHARS;
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const truncatedText = text.length > maxInputChars ? text.slice(0, maxInputChars) : text;
    try {
        const ai = getClient();
        // Nota: responseMimeType: "application/json" es incompatible con tools
        // (la API de Gemini devuelve 400 si se combinan, y además si se combinaran
        // groundingChunks/groundingSupports vienen vacíos igual). Por eso el JSON se
        // pide por prompt, envuelto en un bloque de código, y se extrae en parseGeminiResponse.
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
    }
    catch (err) {
        return errorResult(err instanceof Error ? err.message : "Error desconocido llamando a Gemini.");
    }
}
/**
 * Extrae el objeto JSON de la respuesta de texto de Gemini. Sin responseMimeType
 * (no se puede usar junto con tools como googleSearch), el modelo puede devolver
 * razonamiento antes/después y el JSON envuelto en un bloque de código.
 * Busca primero ese bloque; si no aparece, cae al primer '{' hasta el último '}'.
 */
function extractJsonBlock(raw) {
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
 * El modelo a veces desliza la etiqueta dentro del titular ("FALSO: el estudio no
 * existe"), justo lo que la V1 prohíbe: la etiqueta vive en el chip y el titular es
 * una frase en lenguaje natural. Se limpia acá en vez de confiar solo en el prompt.
 */
function stripVerdictPrefix(headline) {
    return headline
        .replace(/^\s*(verificado|dudoso|falso|sin[\s-]?datos)\s*[:–—-]\s*/i, "")
        .trim();
}
/**
 * Parsea y valida la respuesta cruda de Gemini contra el contrato AnalysisResult.
 * Separado de callGemini para poder testearlo con strings fijos sin pegarle a la API real.
 *
 * groundingLinks es opcional para poder testear con fixtures simples (sin grounding real);
 * en producción siempre viene de extractGroundingLinks().
 */
function parseGeminiResponse(raw, groundingLinks = []) {
    const jsonSnippet = extractJsonBlock(raw);
    let parsed;
    try {
        parsed = JSON.parse(jsonSnippet);
    }
    catch {
        return errorResult("La respuesta de Gemini no es JSON válido.");
    }
    if (typeof parsed !== "object" || parsed === null) {
        return errorResult("La respuesta de Gemini no tiene forma de objeto.");
    }
    const obj = parsed;
    const verdict = typeof obj.verdict === "string" && VALID_VERDICTS.includes(obj.verdict)
        ? obj.verdict
        : null;
    const rawConfidence = typeof obj.confidence === "number" ? Math.round(obj.confidence) : null;
    const confidence = rawConfidence !== null && rawConfidence >= 1 && rawConfidence <= 5
        ? rawConfidence
        : null;
    const headline = typeof obj.headline === "string" ? stripVerdictPrefix(obj.headline) : null;
    const lead = typeof obj.lead === "string" ? obj.lead : null;
    const summary = typeof obj.summary === "string" ? obj.summary : "";
    const reasoning = Array.isArray(obj.reasoning)
        ? obj.reasoning
            .filter((step) => typeof step === "string" && step.trim().length > 0)
            // El prompt pide los pasos sin numerar, pero el modelo a veces igual escribe
            // "01 ..." o "1. ..." — la numeración la dibuja la card, así que se saca acá.
            .map((step) => step.replace(/^\s*\d+\s*[.)–—-]?\s*/, "").trim())
            .slice(0, MAX_REASONING_STEPS)
        : [];
    const toneFlags = Array.isArray(obj.toneFlags)
        ? obj.toneFlags.filter((f) => typeof f === "string")
        : [];
    const rawSources = Array.isArray(obj.sources) ? obj.sources : [];
    const sources = attachRealUrls(rawSources, groundingLinks);
    if (verdict === null || confidence === null || !headline || lead === null) {
        return errorResult("La respuesta de Gemini no tiene los campos esperados (verdict, confidence, headline, lead).");
    }
    // Última defensa contra una combinación fuera de tabla ("falso" con confianza 1):
    // se degrada a "sin-datos" en vez de mostrarle al usuario una contradicción.
    const normalized = (0, types_js_1.normalizeVerdict)(verdict, confidence);
    return {
        verdict: normalized.verdict,
        confidence: normalized.confidence,
        headline,
        lead,
        summary,
        reasoning,
        sources,
        toneFlags,
        success: true,
    };
}
