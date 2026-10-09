import { describe, expect, it } from "vitest";
import { CONFIDENCE_RANGE, normalizeVerdict, type Confidence, type Verdict } from "./types.js";

/**
 * La regla dura del sistema V1: `sin-datos` nunca pasa de 2 y `falso`/`verificado` nunca
 * bajan de 3. Es la única invariante del producto que no se puede verificar mirando la
 * pantalla, porque lo que se ve es siempre una combinación ya normalizada — si esto se
 * rompe, la card muestra una contradicción ("Falso · confianza muy baja") y nadie se
 * entera hasta que alguien la ve en la defensa.
 *
 * Se testea la tabla COMPLETA (4 veredictos × 5 niveles = 20 casos) a propósito: es
 * chica y es la definición del contrato, así que vale escribirla entera en vez de
 * elegir casos sueltos.
 */
const VEREDICTOS: Verdict[] = ["verificado", "dudoso", "falso", "sin-datos"];
const NIVELES: Confidence[] = [1, 2, 3, 4, 5];

describe("normalizeVerdict", () => {
  it("deja intacta toda combinación que está dentro de tabla", () => {
    for (const verdict of VEREDICTOS) {
      const { min, max } = CONFIDENCE_RANGE[verdict];
      for (const confidence of NIVELES) {
        if (confidence < min || confidence > max) continue;
        expect(normalizeVerdict(verdict, confidence)).toEqual({ verdict, confidence });
      }
    }
  });

  it("degrada a sin-datos toda combinación fuera de tabla", () => {
    for (const verdict of VEREDICTOS) {
      const { min, max } = CONFIDENCE_RANGE[verdict];
      for (const confidence of NIVELES) {
        if (confidence >= min && confidence <= max) continue;
        expect(normalizeVerdict(verdict, confidence).verdict).toBe("sin-datos");
      }
    }
  });

  it("el resultado siempre respeta el rango de su propio veredicto", () => {
    for (const verdict of VEREDICTOS) {
      for (const confidence of NIVELES) {
        const r = normalizeVerdict(verdict, confidence);
        const { min, max } = CONFIDENCE_RANGE[r.verdict];
        expect(r.confidence).toBeGreaterThanOrEqual(min);
        expect(r.confidence).toBeLessThanOrEqual(max);
      }
    }
  });

  it("casos concretos de la regla", () => {
    // "No sé, pero con mucha certeza" no existe.
    expect(normalizeVerdict("sin-datos", 5)).toEqual({ verdict: "sin-datos", confidence: 2 });
    // "Falso con una sola fuente secundaria" tampoco: es no saber.
    expect(normalizeVerdict("falso", 1)).toEqual({ verdict: "sin-datos", confidence: 1 });
    expect(normalizeVerdict("verificado", 2)).toEqual({ verdict: "sin-datos", confidence: 2 });
    // dudoso es el estado más frecuente y el que más rango tiene.
    expect(normalizeVerdict("dudoso", 3)).toEqual({ verdict: "dudoso", confidence: 3 });
    expect(normalizeVerdict("dudoso", 5)).toEqual({ verdict: "sin-datos", confidence: 2 });
  });
});
