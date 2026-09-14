/**
 * Chequeo rápido del parser del nuevo contrato (veredicto + confianza), sin pegarle a
 * la API de Gemini. Correr con: npx tsx test-parse.ts
 */
import { parseGeminiResponse } from "./src/gemini/geminiClient.js";
import { normalizeVerdict } from "./src/gemini/types.js";

let fallos = 0;
function check(nombre: string, ok: boolean, detalle?: unknown) {
  if (ok) {
    console.log(`  ok   ${nombre}`);
  } else {
    fallos++;
    console.log(`  FALLA ${nombre}`, detalle ?? "");
  }
}

const respuestaTipica = `Estuve buscando en varias fuentes y esto es lo que encontré.

\`\`\`json
{
  "verdict": "falso",
  "confidence": 4,
  "headline": "FALSO: No encontramos respaldo para esta afirmación",
  "lead": "El estudio que la nota atribuye a la Universidad de Oslo no existe en sus registros públicos.",
  "summary": "La nota afirma que comer pan integral de noche provoca insomnio, citando un supuesto estudio noruego.",
  "reasoning": [
    "01 La nota atribuye un estudio a la Universidad de Oslo, pero no enlaza a ninguna publicación.",
    "2. El repositorio abierto de la universidad no tiene registro del trabajo ni de sus autores.",
    "Dos verificadores independientes revisaron la misma afirmación en los últimos 30 días.",
    "La cadena se origina en un blog sin autoría ni fecha."
  ],
  "sources": [
    { "domain": "uio.no", "title": "University of Oslo", "stance": "contradice", "note": "No registra el estudio ni a los autores citados" },
    { "domain": "efeverifica.com", "title": "EFE Verifica", "stance": "contradice", "note": "Desmintió la afirmación el 9 sep 2026" },
    { "domain": "pubmed.ncbi.nlm.nih.gov", "title": "PubMed", "stance": "sin-datos", "note": "Sin publicaciones que vinculen ambos temas" },
    { "domain": "bienestar-natural.blog", "title": "Bienestar Natural", "stance": "origen", "note": "Primera aparición de la nota, sin autoría" }
  ],
  "toneFlags": ["clickbait", "ausencia de fuentes"]
}
\`\`\``;

const grounding = [
  { title: "uio.no", url: "https://www.uio.no/english/research/" },
  { title: "efeverifica.com", url: "https://efeverifica.com/nota-pan-integral" },
  { title: "pubmed.ncbi.nlm.nih.gov", url: "https://pubmed.ncbi.nlm.nih.gov/?term=bread" },
];

console.log("\n1. Respuesta típica con grounding");
const r = parseGeminiResponse(respuestaTipica, grounding);
check("success", r.success, r.error);
check("verdict = falso", r.verdict === "falso", r.verdict);
check("confidence = 4", r.confidence === 4, r.confidence);
check(
  "el titular pierde el prefijo del veredicto",
  r.headline === "No encontramos respaldo para esta afirmación",
  r.headline
);
check("4 pasos de razonamiento", r.reasoning.length === 4, r.reasoning.length);
check(
  "los pasos vienen sin numerar",
  r.reasoning.every((p) => !/^\d/.test(p)),
  r.reasoning
);
check("4 fuentes", r.sources.length === 4, r.sources.length);
check(
  "la URL real se pega por dominio",
  r.sources[0].url === "https://www.uio.no/english/research/",
  r.sources[0]
);
check(
  "el dominio sale de la URL real, no del modelo",
  r.sources[0].domain === "uio.no",
  r.sources[0].domain
);
check(
  "fuente sin grounding queda con url null",
  r.sources[3].url === null && r.sources[3].domain === "bienestar-natural.blog",
  r.sources[3]
);
check("stance origen se conserva", r.sources[3].stance === "origen", r.sources[3].stance);

console.log("\n2. Combinación imposible (falso + confianza 1) degrada a sin-datos");
const imposible = parseGeminiResponse(
  JSON.stringify({
    verdict: "falso",
    confidence: 1,
    headline: "La nota no coincide con el informe",
    lead: "No hay fuente primaria.",
    summary: "x",
    reasoning: ["a"],
    sources: [],
    toneFlags: [],
  })
);
check("verdict = sin-datos", imposible.verdict === "sin-datos", imposible.verdict);
check("confidence = 1", imposible.confidence === 1, imposible.confidence);

console.log("\n3. Tabla de normalización completa");
check("verificado/5 se respeta", normalizeVerdict("verificado", 5).verdict === "verificado");
check("verificado/2 degrada", normalizeVerdict("verificado", 2).verdict === "sin-datos");
check("dudoso/2 se respeta", normalizeVerdict("dudoso", 2).verdict === "dudoso");
check("dudoso/5 degrada", normalizeVerdict("dudoso", 5).verdict === "sin-datos");
check("sin-datos/2 se respeta", normalizeVerdict("sin-datos", 2).verdict === "sin-datos");
check(
  "sin-datos/4 degrada y recorta la confianza a 2",
  normalizeVerdict("sin-datos", 4).confidence === 2,
  normalizeVerdict("sin-datos", 4)
);

console.log("\n4. Respuestas rotas");
check("JSON inválido", !parseGeminiResponse("no soy json").success);
check(
  "falta el headline",
  !parseGeminiResponse(
    JSON.stringify({ verdict: "dudoso", confidence: 3, lead: "x", summary: "y" })
  ).success
);
check(
  "verdict inventado",
  !parseGeminiResponse(
    JSON.stringify({
      verdict: "mayormente_verdadero",
      confidence: 3,
      headline: "h",
      lead: "l",
    })
  ).success
);

console.log(fallos === 0 ? "\nTODO OK\n" : `\n${fallos} FALLAS\n`);
process.exit(fallos === 0 ? 0 : 1);
