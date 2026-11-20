import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Valida la firma de una notificación (webhook) de Mercado Pago.
 *
 * Mercado Pago manda dos headers:
 *   x-signature:  "ts=1704908010,v1=618c8534..."  (v1 = HMAC-SHA256 en hex)
 *   x-request-id: "bb56a2f1-..."
 * y firma este "manifiesto", armado con el `data.id` de la QUERY (no del body):
 *   id:<data.id>;request-id:<x-request-id>;ts:<ts>;
 * con la clave secreta del webhook (panel de Developers → tu aplicación → Webhooks).
 * Si algún valor no viene, su parte se omite del manifiesto. Si `data.id` es alfanumérico
 * se usa en minúsculas.
 *
 * Una firma válida prueba que el aviso salió de Mercado Pago, pero igual nunca se confía en
 * el body: el estado de la suscripción se vuelve a pedir a la API con el access token.
 */
export function manifiestoDeFirma(partes: {
  dataId: string | null;
  requestId: string | null;
  ts: string;
}): string {
  let manifiesto = "";
  if (partes.dataId) manifiesto += `id:${partes.dataId.toLowerCase()};`;
  if (partes.requestId) manifiesto += `request-id:${partes.requestId};`;
  manifiesto += `ts:${partes.ts};`;
  return manifiesto;
}

export function leerHeaderDeFirma(header: string | undefined): { ts: string; v1: string } | null {
  if (!header) return null;
  let ts: string | null = null;
  let v1: string | null = null;
  for (const parte of header.split(",")) {
    const [clave, ...resto] = parte.split("=");
    const valor = resto.join("=").trim();
    if (clave?.trim() === "ts") ts = valor;
    if (clave?.trim() === "v1") v1 = valor;
  }
  return ts && v1 ? { ts, v1 } : null;
}

export function firmarManifiesto(manifiesto: string, secreto: string): string {
  return createHmac("sha256", secreto).update(manifiesto).digest("hex");
}

export function firmaValida(entrada: {
  xSignature: string | undefined;
  xRequestId: string | undefined;
  dataId: string | null;
  secreto: string;
}): boolean {
  const firma = leerHeaderDeFirma(entrada.xSignature);
  if (!firma || !entrada.secreto) return false;

  const esperada = firmarManifiesto(
    manifiestoDeFirma({ dataId: entrada.dataId, requestId: entrada.xRequestId ?? null, ts: firma.ts }),
    entrada.secreto
  );

  // Comparación en tiempo constante: un `===` filtra por timing cuántos caracteres acertó.
  const a = Buffer.from(esperada, "utf8");
  const b = Buffer.from(firma.v1.toLowerCase(), "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}
