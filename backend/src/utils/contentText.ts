/**
 * Limpieza del texto que llega desde el cliente (lo que leyó el OCR y la persona editó,
 * un texto pegado o una selección). A diferencia de stripControlChars() —pensada para URLs—
 * ésta CONSERVA los saltos de línea: un posteo es multilínea y aplanarlo cambia el sentido.
 */

// Caracteres invisibles o de dirección de texto: sirven para esconder instrucciones a un
// modelo o para que un texto se vea distinto de lo que dice. Se eliminan siempre.
const INVISIBLE_CHARS = /[\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF]/g;
// Controles ASCII salvo \t (0x09) y \n (0x0A). \r se normaliza antes.
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/** Texto multilínea: normaliza saltos, saca invisibles/controles y colapsa líneas en blanco repetidas. */
export function cleanContentText(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(CONTROL_CHARS, "")
    .replace(INVISIBLE_CHARS, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Campo de una sola línea (título, autor): todo el espacio en blanco pasa a un espacio. Devuelve null si queda vacío. */
export function cleanInlineText(raw: unknown, maxChars: number): string | null {
  if (typeof raw !== "string") return null;
  const cleaned = raw
    .replace(CONTROL_CHARS, " ")
    .replace(INVISIBLE_CHARS, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxChars);
  return cleaned.length > 0 ? cleaned : null;
}

/** true si el texto es, entero, una sola URL http(s): en ese caso corresponde /analyze, no /analyze/content. */
export function looksLikeUrl(text: string): boolean {
  if (/\s/.test(text)) return false;
  try {
    const u = new URL(text);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}
