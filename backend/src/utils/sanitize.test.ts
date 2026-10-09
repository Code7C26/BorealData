import { describe, expect, it } from "vitest";
import { stripControlChars } from "./sanitize.js";
import { cleanContentText, cleanInlineText, looksLikeUrl } from "./contentText.js";
import { sanitizePageUrl } from "./pageUrl.js";

describe("stripControlChars", () => {
  it("saca el byte NUL, que rompería el INSERT en Postgres", () => {
    expect(stripControlChars("https://diario.com/nota\u0000")).toBe("https://diario.com/nota");
  });

  it("saca caracteres de control y hace trim", () => {
    expect(stripControlChars("  Renzo\u0007 Lanata\u001F  ")).toBe("Renzo Lanata");
  });

  it("por default saca los saltos de línea (campos de una sola línea)", () => {
    expect(stripControlChars("una\nlinea")).toBe("unalinea");
  });

  it("con keepNewlines conserva \\n y \\t (cuerpo del artículo)", () => {
    expect(stripControlChars("parrafo\n\tsangria", true)).toBe("parrafo\n\tsangria");
    // Pero sigue sacando el resto de los controles.
    expect(stripControlChars("texto\u0000\u0007 real", true)).toBe("texto real");
  });
});

describe("cleanContentText", () => {
  it("normaliza los saltos de línea de Windows", () => {
    expect(cleanContentText("una\r\ndos\rtres")).toBe("una\ndos\ntres");
  });

  it("conserva los saltos: un posteo multilínea aplanado cambia de sentido", () => {
    expect(cleanContentText("URGENTE\n\nse cayó el dólar")).toBe("URGENTE\n\nse cayó el dólar");
  });

  it("colapsa las líneas en blanco de más", () => {
    expect(cleanContentText("una\n\n\n\n\ndos")).toBe("una\n\ndos");
  });

  /**
   * Los invisibles no son un detalle cosmético: son la forma típica de esconder una
   * instrucción dentro del contenido para que el modelo la lea y la persona no la vea.
   */
  it("saca caracteres invisibles y marcas de dirección de texto", () => {
    expect(cleanContentText("inof​ensivo‮")).toBe("inofensivo");
    expect(cleanContentText("a﻿b")).toBe("ab");
  });

  it("saca el espacio al final de cada línea", () => {
    expect(cleanContentText("una   \ndos\t\n")).toBe("una\ndos");
  });
});

describe("cleanInlineText", () => {
  it("aplana todo el espacio en blanco a un espacio", () => {
    expect(cleanInlineText("Publicación   de\n\n@alguien", 100)).toBe("Publicación de @alguien");
  });

  it("recorta al máximo pedido", () => {
    expect(cleanInlineText("abcdefghij", 4)).toBe("abcd");
  });

  it("devuelve null si no es string o si queda vacío", () => {
    expect(cleanInlineText(undefined, 10)).toBe(null);
    expect(cleanInlineText(42, 10)).toBe(null);
    expect(cleanInlineText("   \n  ", 10)).toBe(null);
  });
});

describe("looksLikeUrl", () => {
  it("reconoce una URL sola, que corresponde a /analyze y no a /analyze/content", () => {
    expect(looksLikeUrl("https://diario.com/nota/1")).toBe(true);
    expect(looksLikeUrl("http://diario.com")).toBe(true);
  });

  it("un texto que contiene una URL no es una URL", () => {
    expect(looksLikeUrl("mirá esto https://diario.com/nota/1")).toBe(false);
  });

  it("no toma por URL otros protocolos ni texto suelto", () => {
    expect(looksLikeUrl("file:///etc/passwd")).toBe(false);
    expect(looksLikeUrl("javascript:alert(1)")).toBe(false);
    expect(looksLikeUrl("se cayó el dólar")).toBe(false);
  });
});

describe("sanitizePageUrl", () => {
  /**
   * El contexto de una captura puede venir de una página privada, y en esas URLs los
   * tokens de sesión/invitación viajan justo en la query y en el hash. Guardar la URL
   * completa sería guardar la credencial.
   */
  it("saca la query, el hash y las credenciales embebidas", () => {
    expect(sanitizePageUrl("https://instagram.com/p/abc?token=secreto#access_token=otro")).toBe(
      "https://instagram.com/p/abc"
    );
    expect(sanitizePageUrl("https://usuario:clave@facebook.com/posteo")).toBe(
      "https://facebook.com/posteo"
    );
  });

  it("conserva el path, que es el dato de contexto útil", () => {
    expect(sanitizePageUrl("https://x.com/alguien/status/123")).toBe(
      "https://x.com/alguien/status/123"
    );
  });

  it("devuelve null para lo que no es una URL http(s): un contexto malo no tumba el análisis", () => {
    expect(sanitizePageUrl("chrome://extensions")).toBe(null);
    expect(sanitizePageUrl("no es una url")).toBe(null);
    expect(sanitizePageUrl(undefined)).toBe(null);
    expect(sanitizePageUrl("")).toBe(null);
  });

  it("devuelve null si es absurdamente larga", () => {
    expect(sanitizePageUrl(`https://x.com/${"a".repeat(2100)}`)).toBe(null);
  });
});
