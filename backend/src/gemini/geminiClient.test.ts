import { describe, expect, it } from "vitest";
import { parseGeminiResponse, toGroundingLink } from "./geminiClient.js";

/**
 * Chunks de grounding con la forma REAL de la API de Gemini, medida contra ella el
 * 8-oct-2026: `web.title` es el DOMINIO del medio y `web.uri` es siempre un redirect de
 * `vertexaisearch.cloud.google.com`. Toda la lógica de cruce de fuentes depende de eso,
 * así que los fixtures lo replican literalmente en vez de inventar URLs lindas.
 */
const REDIRECT = "https://vertexaisearch.cloud.google.com/grounding-api-redirect";
const CHUNKS = [
  { title: "indec.gob.ar", url: `${REDIRECT}/AAA` },
  { title: "cronista.com", url: `${REDIRECT}/BBB` },
  { title: "efeverifica.com", url: `${REDIRECT}/CCC` },
];

/** Envuelve un objeto en la respuesta de texto que devuelve el modelo (JSON en un fence). */
function respuestaCon(obj: Record<string, unknown>, prefijo = "Listo, acá va.\n"): string {
  return `${prefijo}\`\`\`json\n${JSON.stringify(obj, null, 2)}\n\`\`\`\n`;
}

const BASE = {
  verdict: "verificado",
  confidence: 4,
  headline: "La cifra coincide con el dato oficial del INDEC",
  lead: "El INDEC publicó 1,7% para agosto de 2026.",
  summary: "La nota informa la inflación de agosto.",
  reasoning: ["Busqué el dato oficial.", "Lo crucé con la nota.", "Coinciden."],
  sources: [] as unknown[],
  toneFlags: [] as string[],
};

describe("toGroundingLink", () => {
  it("saca el dominio de web.title, no de la URL de redirección", () => {
    expect(toGroundingLink({ title: "indec.gob.ar", url: `${REDIRECT}/AAA` })).toEqual({
      domain: "indec.gob.ar",
      title: "indec.gob.ar",
      url: `${REDIRECT}/AAA`,
    });
  });

  it("deja domain en null cuando web.title es un título de página y no un dominio", () => {
    expect(toGroundingLink({ title: "Alina Habba - Wikipedia", url: `${REDIRECT}/X` }).domain).toBe(
      null
    );
  });

  it("normaliza el www del dominio", () => {
    expect(toGroundingLink({ title: "www.bbc.com", url: `${REDIRECT}/Y` }).domain).toBe("bbc.com");
  });
});

describe("parseGeminiResponse — fuentes", () => {
  it("le pega el link real a cada fuente cruzando por dominio", () => {
    const r = parseGeminiResponse(
      respuestaCon({
        ...BASE,
        sources: [
          { domain: "indec.gob.ar", title: "IPC", stance: "confirma", note: "Dato oficial" },
          { domain: "cronista.com", title: "Inflación", stance: "confirma", note: "Cobertura" },
          { domain: "efeverifica.com", title: "Chequeo", stance: "confirma", note: "Verificador" },
        ],
      }),
      CHUNKS
    );

    expect(r.success).toBe(true);
    expect(r.sources.map((s) => s.url)).toEqual([
      `${REDIRECT}/AAA`,
      `${REDIRECT}/BBB`,
      `${REDIRECT}/CCC`,
    ]);
  });

  /**
   * La regresión que motivó el fix del 8-oct-2026: el cruce comparaba el dominio que
   * escribía el modelo contra el hostname de `web.uri`, que es SIEMPRE el del redirect de
   * Google. Nunca podía acertar, y cuando pegaba por el fallback de título mostraba
   * "vertexaisearch.cloud.google.com" como dominio de la fuente.
   */
  it("nunca muestra el host del redirect como dominio de la fuente", () => {
    const r = parseGeminiResponse(
      respuestaCon({
        ...BASE,
        sources: [
          { domain: "indec.gob.ar", title: "IPC", stance: "confirma", note: "Dato oficial" },
        ],
      }),
      CHUNKS
    );

    expect(r.sources[0].domain).toBe("indec.gob.ar");
    expect(r.sources.some((s) => s.domain.includes("vertexaisearch"))).toBe(false);
  });

  it("deja url en null —sin inventar link— para la fuente que no está en el grounding", () => {
    const r = parseGeminiResponse(
      respuestaCon({
        ...BASE,
        sources: [
          { domain: "indec.gob.ar", title: "IPC", stance: "confirma", note: "Dato oficial" },
          {
            domain: "diario-inexistente.com",
            title: "Nota sin respaldo",
            stance: "sin-datos",
            note: "No figura",
          },
        ],
      }),
      CHUNKS
    );

    expect(r.sources[0].url).toBe(`${REDIRECT}/AAA`);
    expect(r.sources[1].url).toBe(null);
    // Sin match, el dominio que queda es el que escribió el modelo: es lo único que hay.
    expect(r.sources[1].domain).toBe("diario-inexistente.com");
  });

  it("no le asigna el mismo link a dos fuentes distintas", () => {
    const r = parseGeminiResponse(
      respuestaCon({
        ...BASE,
        sources: [
          { domain: "indec.gob.ar", title: "IPC agosto", stance: "confirma", note: "Oficial" },
          { domain: "indec.gob.ar", title: "IPC julio", stance: "confirma", note: "Oficial" },
        ],
      }),
      CHUNKS
    );

    expect(r.sources[0].url).toBe(`${REDIRECT}/AAA`);
    // Solo hay un chunk de indec.gob.ar: la segunda queda sin link en vez de repetirlo.
    expect(r.sources[1].url).toBe(null);
  });

  it("cruza por subdominio en los dos sentidos", () => {
    const r = parseGeminiResponse(
      respuestaCon({
        ...BASE,
        sources: [
          { domain: "www.indec.gob.ar", title: "IPC", stance: "confirma", note: "Oficial" },
        ],
      }),
      [{ title: "indec.gob.ar", url: `${REDIRECT}/AAA` }]
    );

    expect(r.sources[0].url).toBe(`${REDIRECT}/AAA`);
  });

  it("descarta la fuente con stance inválido", () => {
    const r = parseGeminiResponse(
      respuestaCon({
        ...BASE,
        sources: [
          { domain: "indec.gob.ar", title: "IPC", stance: "confirma", note: "ok" },
          { domain: "cronista.com", title: "Nota", stance: "me-parece-que-si", note: "ok" },
        ],
      }),
      CHUNKS
    );

    expect(r.sources).toHaveLength(1);
    expect(r.sources[0].domain).toBe("indec.gob.ar");
  });

  it("sin grounding (sin búsqueda), las fuentes quedan sin link pero con su dominio", () => {
    const r = parseGeminiResponse(
      respuestaCon({
        ...BASE,
        sources: [
          {
            domain: "el-propio-texto",
            title: "Contradicción interna",
            stance: "contradice",
            note: "La nota se desmiente sola",
          },
        ],
      }),
      []
    );

    expect(r.sources[0].url).toBe(null);
    expect(r.sources[0].domain).toBe("el-propio-texto");
  });
});

describe("parseGeminiResponse — contrato del análisis", () => {
  it("extrae el JSON del bloque de código aunque haya prosa antes y después", () => {
    const r = parseGeminiResponse(
      `Pensé bastante esto.\n${respuestaCon(BASE, "")}\nY eso es todo.`,
      CHUNKS
    );
    expect(r.success).toBe(true);
    expect(r.verdict).toBe("verificado");
  });

  it("cae al primer { hasta el último } cuando no hay bloque de código", () => {
    const r = parseGeminiResponse(JSON.stringify(BASE), CHUNKS);
    expect(r.success).toBe(true);
    expect(r.confidence).toBe(4);
  });

  it("saca la etiqueta del veredicto del titular", () => {
    const r = parseGeminiResponse(
      respuestaCon({ ...BASE, headline: "FALSO: el estudio no existe", verdict: "falso" }),
      CHUNKS
    );
    expect(r.headline).toBe("el estudio no existe");
  });

  it("saca la numeración que el modelo agrega a los pasos", () => {
    const r = parseGeminiResponse(
      respuestaCon({ ...BASE, reasoning: ["1. Busqué.", "02) Cruce.", "3 - Coinciden."] }),
      CHUNKS
    );
    expect(r.reasoning).toEqual(["Busqué.", "Cruce.", "Coinciden."]);
  });

  it("corta el razonamiento en 5 pasos", () => {
    const r = parseGeminiResponse(
      respuestaCon({ ...BASE, reasoning: ["a", "b", "c", "d", "e", "f", "g"] }),
      CHUNKS
    );
    expect(r.reasoning).toHaveLength(5);
  });

  it("degrada a sin-datos la combinación fuera de tabla", () => {
    const r = parseGeminiResponse(
      respuestaCon({ ...BASE, verdict: "falso", confidence: 1 }),
      CHUNKS
    );
    expect(r.verdict).toBe("sin-datos");
    expect(r.confidence).toBeLessThanOrEqual(2);
  });

  it("falla con un mensaje claro si la respuesta no es JSON", () => {
    const r = parseGeminiResponse("No puedo ayudarte con eso.", CHUNKS);
    expect(r.success).toBe(false);
    expect(r.error).toMatch(/JSON/i);
  });

  it("falla si falta un campo del contrato", () => {
    const { headline: _omitido, ...sinHeadline } = BASE;
    const r = parseGeminiResponse(respuestaCon(sinHeadline), CHUNKS);
    expect(r.success).toBe(false);
    expect(r.verdict).toBe("sin-datos");
  });

  it("falla si el veredicto no es uno de los cuatro", () => {
    const r = parseGeminiResponse(respuestaCon({ ...BASE, verdict: "probable" }), CHUNKS);
    expect(r.success).toBe(false);
  });

  it("redondea una confianza decimal y rechaza la que queda fuera de 1-5", () => {
    expect(parseGeminiResponse(respuestaCon({ ...BASE, confidence: 3.7 }), CHUNKS).confidence).toBe(
      4
    );
    expect(parseGeminiResponse(respuestaCon({ ...BASE, confidence: 9 }), CHUNKS).success).toBe(
      false
    );
  });
});
