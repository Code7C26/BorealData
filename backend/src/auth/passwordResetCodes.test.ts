import { afterEach, describe, expect, it, vi } from "vitest";
import {
  consumirCodigo,
  crearCodigo,
  DURACION_MINUTOS,
  MAX_INTENTOS,
  normalizarEmail,
  verificarCodigo,
} from "./passwordResetCodes.js";

const EMAIL = "persona@ejemplo.com";

/** Un código de 6 dígitos que seguro no es `codigo`. */
function otro(codigo: string): string {
  return codigo === "000000" ? "111111" : "000000";
}

afterEach(() => {
  consumirCodigo(EMAIL);
  vi.useRealTimers();
});

describe("códigos de recuperación de contraseña", () => {
  it("genera siempre 6 dígitos", () => {
    for (let i = 0; i < 50; i++) expect(crearCodigo(EMAIL)).toMatch(/^\d{6}$/);
  });

  it("acepta el código correcto, también con espacios o guiones al tipearlo", () => {
    const codigo = crearCodigo(EMAIL);
    expect(verificarCodigo(EMAIL, codigo)).toBe("ok");
    expect(verificarCodigo(EMAIL, `${codigo.slice(0, 3)} ${codigo.slice(3)}`)).toBe("ok");
  });

  it("un acierto no lo consume hasta consumirCodigo", () => {
    const codigo = crearCodigo(EMAIL);
    expect(verificarCodigo(EMAIL, codigo)).toBe("ok");
    expect(verificarCodigo(EMAIL, codigo)).toBe("ok");
    consumirCodigo(EMAIL);
    expect(verificarCodigo(EMAIL, codigo)).toBe("vencido");
  });

  it("rechaza un código incorrecto y lo invalida al llegar al máximo de intentos", () => {
    const codigo = crearCodigo(EMAIL);
    for (let i = 1; i < MAX_INTENTOS; i++) expect(verificarCodigo(EMAIL, otro(codigo))).toBe("incorrecto");
    expect(verificarCodigo(EMAIL, otro(codigo))).toBe("sin-intentos");
    // Ni el correcto sirve después: hay que pedir otro.
    expect(verificarCodigo(EMAIL, codigo)).toBe("vencido");
  });

  it("vence a los 15 minutos", () => {
    vi.useFakeTimers();
    const codigo = crearCodigo(EMAIL);
    vi.advanceTimersByTime(DURACION_MINUTOS * 60_000 + 1);
    expect(verificarCodigo(EMAIL, codigo)).toBe("vencido");
  });

  it("pedir uno nuevo invalida el anterior", () => {
    const viejo = crearCodigo(EMAIL);
    let nuevo = crearCodigo(EMAIL);
    while (nuevo === viejo) nuevo = crearCodigo(EMAIL);
    expect(verificarCodigo(EMAIL, viejo)).toBe("incorrecto");
    expect(verificarCodigo(EMAIL, nuevo)).toBe("ok");
  });

  it("un código no sirve para otro email", () => {
    const codigo = crearCodigo(EMAIL);
    expect(verificarCodigo("otra@ejemplo.com", codigo)).toBe("vencido");
  });

  it("normaliza mayúsculas y espacios del email", () => {
    expect(normalizarEmail("  Persona@Ejemplo.COM ")).toBe(EMAIL);
  });
});
