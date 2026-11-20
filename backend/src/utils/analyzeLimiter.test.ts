import { describe, expect, it } from "vitest";
import { ANALYZE_RATE_LIMIT, ANALYZE_RATE_LIMIT_PREMIUM, consumirRafaga } from "./analyzeLimiter.js";

describe("ráfaga por hora según el plan", () => {
  it("Gratuito corta en 20 por hora", () => {
    for (let i = 0; i < ANALYZE_RATE_LIMIT; i++) {
      expect(consumirRafaga("uid-gratis", "gratuito").allowed).toBe(true);
    }
    const corte = consumirRafaga("uid-gratis", "gratuito");
    expect(corte.allowed).toBe(false);
    expect(corte.limite).toBe(20);
  });

  it("Premium tiene su propia ráfaga, más alta", () => {
    for (let i = 0; i < ANALYZE_RATE_LIMIT_PREMIUM; i++) {
      expect(consumirRafaga("uid-premium", "premium").allowed).toBe(true);
    }
    const corte = consumirRafaga("uid-premium", "premium");
    expect(corte.allowed).toBe(false);
    expect(corte.limite).toBe(ANALYZE_RATE_LIMIT_PREMIUM);
    expect(ANALYZE_RATE_LIMIT_PREMIUM).toBeGreaterThan(ANALYZE_RATE_LIMIT);
  });
});
