/**
 * De qué plataforma es la página que se está capturando.
 *
 * Es una PISTA para el backend, no un dato confiable: el servidor la valida
 * contra KNOWN_PLATFORMS y, en el paso de lectura, el propio modelo reconoce
 * la plataforma en la imagen (CaptureReading.platform) y puede diferir. Acá
 * solo sirve para dos cosas honestas: etiquetar la pantalla de revisión
 * ("Publicación en Instagram") y decidir si hace falta pedir permiso de host.
 */
import type { Platform } from '@/lib/analysis';

/**
 * Dominios con sesión donde el scraper del backend solo ve el muro de login
 * — el caso que justifica todo este camino (ver DOCS/BRIEF-captura-contenido-privado.md).
 * Tienen que coincidir con `host_permissions` de wxt.config.ts: son los únicos
 * sitios donde la captura no necesita pedir permiso.
 */
export const PLATAFORMAS_POR_DOMINIO: { sufijo: string; platform: Platform }[] = [
  { sufijo: 'facebook.com', platform: 'facebook' },
  { sufijo: 'instagram.com', platform: 'instagram' },
  { sufijo: 'x.com', platform: 'x' },
  { sufijo: 'twitter.com', platform: 'x' },
  { sufijo: 'web.whatsapp.com', platform: 'whatsapp' },
  { sufijo: 'tiktok.com', platform: 'tiktok' },
];

export const ETIQUETA_PLATAFORMA: Record<Platform, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  x: 'X',
  whatsapp: 'WhatsApp',
  tiktok: 'TikTok',
  otro: 'otra plataforma',
};

function hostname(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * `null` cuando no es una red social conocida: ahí el backend no recibe pista
 * y se queda con lo que lea el modelo. Devolver "otro" sería peor, porque
 * afirmaría algo que no sabemos.
 */
export function detectarPlataforma(url: string | null | undefined): Platform | null {
  const host = hostname(url);
  if (!host) return null;
  const match = PLATAFORMAS_POR_DOMINIO.find(
    ({ sufijo }) => host === sufijo || host.endsWith(`.${sufijo}`),
  );
  return match?.platform ?? null;
}

/**
 * El patrón de permiso de host que hace falta para capturar esta pestaña
 * (`https://instagram.com/*`). `null` si la URL no es http(s) — una página
 * `chrome://` o la Chrome Web Store no se pueden capturar por política del
 * navegador, ni pidiendo permiso.
 */
export function patronDePermiso(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const { protocol, hostname: host } = new URL(url);
    if (protocol !== 'http:' && protocol !== 'https:') return null;
    return `${protocol}//${host}/*`;
  } catch {
    return null;
  }
}

/** Etiqueta corta de la página capturada, para el encabezado del panel. */
export function etiquetaDeOrigen(url: string | null | undefined): string {
  const host = hostname(url);
  if (!host) return 'esta pantalla';
  return host.startsWith('www.') ? host.slice(4) : host;
}
