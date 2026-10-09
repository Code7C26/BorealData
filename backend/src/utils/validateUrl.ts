import dns from "node:dns";
import net from "node:net";

/**
 * Rangos de IPv4 privados/internos (RFC 1918, loopback, link-local —incluye el
 * endpoint de metadata de la nube 169.254.169.254—, CGNAT y "esta red").
 */
function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) return false;

  const [a, b] = parts;
  if (a === 0) return true; // 0.0.0.0/8
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 127) return true; // 127.0.0.0/8 (loopback)
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 (link-local, metadata de la nube)
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 (CGNAT)
  return false;
}

/**
 * Devuelve la IPv4 embebida en una IPv6 mapeada (`::ffff:…`) en notación decimal, o null
 * si no es una de esas.
 *
 * Hay que entender las DOS formas porque la API de URL normaliza la dirección: lo que el
 * cliente escribe como `[::ffff:127.0.0.1]` llega acá como `::ffff:7f00:1`, en
 * hexadecimal. La versión anterior solo miraba la forma con puntos, así que
 * `http://[::ffff:127.0.0.1]/` se colaba como pública y el servidor terminaba pegándole a
 * su propio loopback (lo agarró el test de validateUrl.test.ts).
 */
function mappedIPv4(ip: string): string | null {
  const resto = /^::ffff:(.+)$/.exec(ip)?.[1];
  if (resto === undefined) return null;
  if (resto.includes(".")) return resto;

  const grupos = resto.split(":");
  if (grupos.length > 2) return null;
  const [altoRaw, bajoRaw] = grupos.length === 2 ? grupos : ["0", grupos[0]];

  const alto = Number.parseInt(altoRaw, 16);
  const bajo = Number.parseInt(bajoRaw, 16);
  if (!Number.isInteger(alto) || !Number.isInteger(bajo)) return null;
  if (alto < 0 || alto > 0xffff || bajo < 0 || bajo > 0xffff) return null;

  return [alto >> 8, alto & 0xff, bajo >> 8, bajo & 0xff].join(".");
}

/** Rangos de IPv6 privados/internos (loopback, link-local, unique local, IPv4 mapeada). */
function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (normalized === "::1" || normalized === "::") return true;
  if (normalized.startsWith("fe80:")) return true; // link-local
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true; // fc00::/7 (unique local)

  // IPv4 mapeada en IPv6 (::ffff:127.0.0.1 y su forma normalizada ::ffff:7f00:1).
  const embebida = mappedIPv4(normalized);
  if (embebida !== null) return isPrivateIPv4(embebida);

  return false;
}

function isPrivateAddress(address: string): boolean {
  const version = net.isIP(address);
  if (version === 4) return isPrivateIPv4(address);
  if (version === 6) return isPrivateIPv6(address);
  return false;
}

export interface UrlSafetyResult {
  safe: boolean;
  reason?: string;
}

/**
 * Valida que `rawUrl` sea una URL http/https pública, para evitar SSRF: sin esto,
 * /analyze (POST) le pide a scrapeUrl() que haga la request server-side (axios y
 * Puppeteer) a *cualquier* string que mande el cliente, incluyendo direcciones de
 * la red interna del backend (localhost, 127.0.0.1, 169.254.169.254 —metadata de
 * la nube en AWS/GCP—, rangos 10.x/172.16-31.x/192.168.x, etc).
 *
 * Resuelve el hostname y valida CADA IP resultante (no solo la primera) para
 * cubrir DNS rebinding: un dominio público que resuelve a una IP interna.
 */
export async function assertSafeAnalyzeUrl(rawUrl: string): Promise<UrlSafetyResult> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { safe: false, reason: "La URL no tiene un formato válido." };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { safe: false, reason: "Solo se permiten URLs http o https." };
  }

  // Un host IPv6 viene entre corchetes en `hostname` ("[::1]"), y net.isIP() no los
  // acepta: sin sacarlos, una IPv6 interna se escapaba del chequeo de IP literal y
  // terminaba bloqueada de rebote, porque "[::1]" no resuelve por DNS. Funcionaba, pero
  // por el camino equivocado: acá se decide por la IP, que es lo que corresponde.
  const hostname = parsed.hostname.toLowerCase().replace(/^\[(.+)\]$/, "$1");
  if (hostname === "localhost") {
    return { safe: false, reason: "No se permiten URLs a localhost." };
  }

  // Si el hostname ya es una IP literal, validarla directo.
  if (net.isIP(hostname)) {
    if (isPrivateAddress(hostname)) {
      return { safe: false, reason: "No se permiten URLs a direcciones IP privadas o internas." };
    }
    return { safe: true };
  }

  try {
    const records = await dns.promises.lookup(hostname, { all: true });
    if (records.length === 0) {
      return { safe: false, reason: "No se pudo resolver el dominio de la URL." };
    }
    if (records.some((record) => isPrivateAddress(record.address))) {
      return {
        safe: false,
        reason: "El dominio de la URL resuelve a una dirección IP privada o interna.",
      };
    }
  } catch {
    return { safe: false, reason: "No se pudo resolver el dominio de la URL." };
  }

  return { safe: true };
}
