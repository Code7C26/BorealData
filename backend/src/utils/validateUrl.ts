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

/** Rangos de IPv6 privados/internos (loopback, link-local, unique local). */
function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (normalized === "::1" || normalized === "::") return true;
  if (normalized.startsWith("fe80:")) return true; // link-local
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true; // fc00::/7 (unique local)

  // IPv4 mapeada en IPv6 (::ffff:127.0.0.1)
  if (normalized.startsWith("::ffff:")) {
    const ipv4Part = normalized.split(":").pop()!;
    if (ipv4Part.includes(".")) return isPrivateIPv4(ipv4Part);
  }
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

  const hostname = parsed.hostname.toLowerCase();
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
