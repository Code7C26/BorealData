import { describe, expect, it, vi } from "vitest";
import { CUPOS, type Ventana } from "./config.js";
import {
  mensajeDeCupoAgotado,
  periodoDelCupo,
  planVigente,
  puedeArrepentirse,
  renovacionDelCupo,
} from "./cupo.js";
import { crearControlDeCupo, respuestaCupoAgotado, type DependenciasCupo } from "./controlDeCupo.js";

const AHORA = new Date("2026-11-19T15:00:00Z"); // 12:00 en Buenos Aires
const DIA = 24 * 60 * 60 * 1000;

describe("cupos por plan", () => {
  it("Gratuito: 3 por día; Premium: uso justo por mes", () => {
    expect(CUPOS.gratuito).toEqual({ limite: 3, ventana: "dia" });
    expect(CUPOS.premium.ventana).toBe("mes");
  });
});

describe("planVigente", () => {
  it("gratuito es gratuito", () => {
    expect(planVigente({ plan: "gratuito", planDesde: null, planHasta: null }, AHORA)).toBe("gratuito");
  });

  it("premium vale mientras plan_hasta no venció", () => {
    const hasta = new Date(AHORA.getTime() + DIA);
    expect(planVigente({ plan: "premium", planDesde: AHORA, planHasta: hasta }, AHORA)).toBe("premium");
  });

  it("premium vencido vuelve solo a gratuito (cobro fallido sin webhook)", () => {
    const hasta = new Date(AHORA.getTime() - 1);
    expect(planVigente({ plan: "premium", planDesde: AHORA, planHasta: hasta }, AHORA)).toBe("gratuito");
  });
});

describe("período del cupo en hora argentina", () => {
  it("el día cambia a la medianoche de Buenos Aires, no a la de UTC", () => {
    // 23:30 del 19 en Buenos Aires = 02:30 del 20 en UTC.
    expect(periodoDelCupo("dia", new Date("2026-11-20T02:30:00Z"))).toBe("2026-11-19");
    // 00:30 del 20 en Buenos Aires.
    expect(periodoDelCupo("dia", new Date("2026-11-20T03:30:00Z"))).toBe("2026-11-20");
  });

  it("el gratuito se renueva mañana, también al cambiar de mes y de año", () => {
    expect(renovacionDelCupo("dia", AHORA)).toBe("2026-11-20");
    expect(renovacionDelCupo("dia", new Date("2026-11-30T15:00:00Z"))).toBe("2026-12-01");
    expect(renovacionDelCupo("dia", new Date("2026-12-31T15:00:00Z"))).toBe("2027-01-01");
  });

  it("el mensual usa el día 1 y se renueva el 1 del mes que viene", () => {
    expect(periodoDelCupo("mes", AHORA)).toBe("2026-11-01");
    // 23:00 del 30-nov en Buenos Aires: todavía es noviembre aunque en UTC sea diciembre.
    expect(periodoDelCupo("mes", new Date("2026-12-01T02:00:00Z"))).toBe("2026-11-01");
    expect(renovacionDelCupo("mes", new Date("2026-12-15T12:00:00Z"))).toBe("2027-01-01");
  });
});

describe("botón de arrepentimiento", () => {
  const hasta = new Date(AHORA.getTime() + 30 * DIA);

  it("vale dentro de los 10 días", () => {
    const desde = new Date(AHORA.getTime() - 9 * DIA);
    expect(puedeArrepentirse({ plan: "premium", planDesde: desde, planHasta: hasta }, AHORA)).toBe(true);
  });

  it("no vale pasados los 10 días", () => {
    const desde = new Date(AHORA.getTime() - 11 * DIA);
    expect(puedeArrepentirse({ plan: "premium", planDesde: desde, planHasta: hasta }, AHORA)).toBe(false);
  });

  it("no vale sin Premium", () => {
    expect(puedeArrepentirse({ plan: "gratuito", planDesde: null, planHasta: null }, AHORA)).toBe(false);
  });
});

describe("mensaje de cupo agotado", () => {
  it("al gratuito le dice que se renueva mañana y cuánto da Premium", () => {
    const mensaje = mensajeDeCupoAgotado("gratuito", 3, "2026-11-20");
    expect(mensaje).toContain("3 análisis gratis de hoy");
    expect(mensaje).toContain("mañana");
    expect(mensaje).toContain(String(CUPOS.premium.limite));
  });

  it("a Premium le dice el día del mes en que se renueva", () => {
    expect(mensajeDeCupoAgotado("premium", 300, "2026-12-01")).toContain("1 de diciembre");
  });
});

/** Base en memoria con la MISMA regla que el INSERT ... WHERE analisis < tope. */
function baseFalsa(plan: "gratuito" | "premium" = "gratuito") {
  const uso = new Map<string, number>();
  const clave = (userId: string, ventana: Ventana, periodo: string) => `${userId}|${ventana}|${periodo}`;
  const deps: DependenciasCupo = {
    ahora: () => AHORA,
    getPlan: vi.fn(async () => ({
      plan,
      planDesde: plan === "premium" ? AHORA : null,
      planHasta: plan === "premium" ? new Date(AHORA.getTime() + 30 * DIA) : null,
    })),
    sumarUsoSiHayCupo: vi.fn(async (userId: string, ventana: Ventana, periodo: string, limite: number) => {
      const k = clave(userId, ventana, periodo);
      const actual = uso.get(k) ?? 0;
      if (actual >= limite) return null;
      uso.set(k, actual + 1);
      return actual + 1;
    }),
    restarUso: vi.fn(async (userId: string, ventana: Ventana, periodo: string) => {
      const k = clave(userId, ventana, periodo);
      uso.set(k, Math.max(0, (uso.get(k) ?? 0) - 1));
    }),
  };
  return { deps, uso };
}

describe("control de cupo", () => {
  it("deja pasar los análisis gratis del día y corta el siguiente con 429 cupo_agotado", async () => {
    const { deps } = baseFalsa("gratuito");
    const consumir = crearControlDeCupo(deps);

    for (let i = 0; i < CUPOS.gratuito.limite; i++) {
      expect((await consumir("uid", "user-1")).permitido).toBe(true);
    }
    const corte = await consumir("uid", "user-1");
    expect(corte.permitido).toBe(false);
    if (corte.permitido) return;

    const cuerpo = respuestaCupoAgotado(corte);
    expect(cuerpo.code).toBe("cupo_agotado");
    expect(cuerpo.limite).toBe(CUPOS.gratuito.limite);
    expect(cuerpo.ventana).toBe("dia");
    expect(cuerpo.renueva).toBe("2026-11-20");
  });

  it("al día siguiente vuelve a haber cupo gratis", async () => {
    const { deps } = baseFalsa("gratuito");
    let ahora = AHORA;
    deps.ahora = () => ahora;
    const consumir = crearControlDeCupo(deps);
    for (let i = 0; i < CUPOS.gratuito.limite; i++) await consumir("uid", "user-1");
    expect((await consumir("uid", "user-1")).permitido).toBe(false);

    ahora = new Date(AHORA.getTime() + DIA);
    expect((await consumir("uid", "user-1")).permitido).toBe(true);
  });

  it("Premium cuenta por mes con el tope de uso justo", async () => {
    const { deps } = baseFalsa("premium");
    await crearControlDeCupo(deps)("uid", "user-1");
    expect(deps.sumarUsoSiHayCupo).toHaveBeenCalledWith("user-1", "mes", "2026-11-01", CUPOS.premium.limite);
  });

  it("devolver() repone el análisis en el mismo período en que se descontó", async () => {
    const { deps, uso } = baseFalsa("gratuito");
    const r = await crearControlDeCupo(deps)("uid", "user-1");
    expect(uso.get("user-1|dia|2026-11-19")).toBe(1);
    if (!r.permitido) throw new Error("debería haber cupo");
    await r.devolver();
    expect(uso.get("user-1|dia|2026-11-19")).toBe(0);
  });

  it("si la base falla deja pasar (no tumba el producto)", async () => {
    const { deps } = baseFalsa();
    deps.getPlan = vi.fn(async () => {
      throw Object.assign(new Error('relation "uso_analisis" does not exist'), { code: "42P01" });
    });
    const r = await crearControlDeCupo(deps)("uid", "user-1");
    expect(r.permitido).toBe(true);
  });

  it("sin id interno de usuario deja pasar sin contar", async () => {
    const { deps } = baseFalsa();
    const r = await crearControlDeCupo(deps)("uid", null);
    expect(r.permitido).toBe(true);
    expect(deps.sumarUsoSiHayCupo).not.toHaveBeenCalled();
  });
});
