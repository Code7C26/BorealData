/**
 * Canal de reportes: los usuarios escriben a esta casilla para avisar de un error,
 * un análisis que les parece incorrecto o cualquier otro problema.
 *
 * Se abre el redactor de Gmail directamente (en vez de un `mailto:`) porque un mailto
 * depende del cliente de correo que tenga configurado el sistema —en Windows suele ser
 * Outlook o nada— y la idea es que el enlace lleve a Gmail.
 */
export const REPORTES_EMAIL = 'soporte@aletheiainc.online'

/** URL del redactor de Gmail con destinatario, asunto y cuerpo ya cargados. */
export function urlReporteGmail(asunto: string, cuerpo: string): string {
  const params = [
    'view=cm',
    'fs=1',
    `to=${encodeURIComponent(REPORTES_EMAIL)}`,
    `su=${encodeURIComponent(asunto)}`,
    `body=${encodeURIComponent(cuerpo)}`,
  ]
  return `https://mail.google.com/mail/?${params.join('&')}`
}
