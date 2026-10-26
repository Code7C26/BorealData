import { FirebaseError } from 'firebase/app';

/**
 * Los códigos de Firebase Auth traducidos — espejo de
 * `apps/lib/firebase-errors.ts`, sin la capa de idiomas (la app arranca solo en
 * castellano).
 *
 * `auth/network-request-failed` es MUCHO más frecuente acá que en la web: en el
 * teléfono la red se corta sola, así que el texto dice qué revisar.
 */
const MENSAJES_POR_CODIGO: Record<string, string> = {
  'auth/invalid-email': 'El email ingresado no es válido.',
  'auth/user-disabled': 'Esta cuenta fue deshabilitada.',
  'auth/user-not-found': 'No encontramos una cuenta con ese email.',
  'auth/wrong-password': 'La contraseña es incorrecta.',
  'auth/invalid-credential': 'Email o contraseña incorrectos.',
  'auth/email-already-in-use': 'Ya existe una cuenta con ese email.',
  'auth/weak-password': 'La contraseña debe tener al menos 8 caracteres.',
  'auth/too-many-requests': 'Demasiados intentos. Probá de nuevo en unos minutos.',
  'auth/network-request-failed': 'Problema de conexión. Revisá el WiFi o los datos e intentá de nuevo.',
  'auth/invalid-api-key': 'Falta configurar Firebase en la app (mobile/.env.local).',
};

export function mensajeErrorFirebase(err: unknown, fallback: string): string {
  if (err instanceof FirebaseError) {
    return MENSAJES_POR_CODIGO[err.code] ?? fallback;
  }
  return fallback;
}
