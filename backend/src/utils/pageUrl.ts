const MAX_PAGE_URL_LENGTH = 2048;

/**
 * `pageUrl` que manda el cliente en una captura: es solo un dato de contexto para mostrar
 * ("de dónde salió"), NUNCA se scrapea ni se hace fetch. Como puede ser una página privada,
 * se guarda sin credenciales embebidas, sin query string y sin hash — las URLs privadas
 * suelen llevar tokens de sesión o de invitación ahí (`?token=…`, `#access_token=…`).
 *
 * Devuelve null si no es una URL http(s) válida: un dato de contexto malo no debe tumbar
 * el análisis, simplemente se descarta.
 */
export function sanitizePageUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_PAGE_URL_LENGTH) return null;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;

  url.username = "";
  url.password = "";
  url.search = "";
  url.hash = "";
  return url.toString();
}
