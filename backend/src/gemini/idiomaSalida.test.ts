import { describe, expect, it } from "vitest";
import { asegurarIdioma, pareceCastellano } from "./idiomaSalida.js";
import type { AnalysisResult } from "./types.js";

/** Los textos del caso real que motivó la red (Univision, 22-oct-2026). */
const TITULAR_ES =
  "Encontramos respaldo para la red de matrimonios fraudulentos y las acusaciones contra Jennifer González en Massachusetts.";
const BAJADA_ES =
  "La Fiscalía Federal del Distrito de Massachusetts y múltiples medios de comunicación confirmaron los cargos y detalles de la presunta red.";

const base: AnalysisResult = {
  verdict: "verificado", confidence: 5, headline: TITULAR_ES, lead: BAJADA_ES,
  summary: "The article reports on six individuals accused in Massachusetts.",
  reasoning: ["Multiple news outlets published articles on October 21, 2026."],
  sources: [{ domain: "cbsnews.com", title: "CBS", url: null, stance: "confirma", note: "Corroborates the charges." }],
  toneFlags: [], success: true,
};

describe("pareceCastellano", () => {
  it("detecta el titular y la bajada del caso real", () => {
    expect(pareceCastellano(TITULAR_ES)).toBe(true);
    expect(pareceCastellano(BAJADA_ES)).toBe(true);
  });
  it("no marca inglés con nombres propios en castellano", () => {
    expect(pareceCastellano("Confirms Hansi Flick as FC Barcelona's head coach.")).toBe(false);
    expect(pareceCastellano("The study is not in the Universidad de Oslo repository.")).toBe(false);
  });
});

describe("asegurarIdioma", () => {
  it("traduce solo los campos en castellano cuando se pidió inglés", async () => {
    let pedidos: string[] = [];
    const { result, corregidos } = await asegurarIdioma(base, "en", async (t) => {
      pedidos = Object.keys(t);
      return { headline: "We found support for the fake marriage ring.", lead: "Federal prosecutors confirmed the charges." };
    });
    expect(pedidos).toEqual(["headline", "lead"]);
    expect(corregidos).toEqual(["headline", "lead"]);
    expect(result.headline).toBe("We found support for the fake marriage ring.");
    expect(result.summary).toBe(base.summary);
  });
  it("en castellano, o si todo ya está en inglés, no llama al traductor", async () => {
    const nunca = async () => { throw new Error("no debería llamarse"); };
    expect((await asegurarIdioma(base, "es", nunca)).result).toBe(base);
    const enIngles = { ...base, headline: "We found support for the ring.", lead: "Prosecutors confirmed the charges." };
    expect((await asegurarIdioma(enIngles, "en", nunca)).corregidos).toEqual([]);
  });
  it("si la traducción falla, deja el análisis como vino", async () => {
    const r = await asegurarIdioma(base, "en", async () => { throw new Error("timeout"); });
    expect(r.result).toBe(base);
  });
});
