import { FirebaseError } from "firebase/app";

const MENSAJES_POR_CODIGO: Record<string, string> = {
  "auth/invalid-email": "El email ingresado no es válido.",
  "auth/user-disabled": "Esta cuenta fue deshabilitada.",
  "auth/user-not-found": "No encontramos una cuenta con ese email.",
  "auth/wrong-password": "La contraseña es incorrecta.",
  "auth/invalid-credential": "Email o contraseña incorrectos.",
  "auth/email-already-in-use": "Ya existe una cuenta con ese email.",
  "auth/weak-password": "La contraseña debe tener al menos 8 caracteres.",
  "auth/too-many-requests": "Demasiados intentos. Probá de nuevo en unos minutos.",
  "auth/network-request-failed": "Problema de conexión. Revisá tu internet e intentá de nuevo.",
};

export function mensajeErrorFirebase(err: unknown, fallback: string): string {
  if (err instanceof FirebaseError) {
    return MENSAJES_POR_CODIGO[err.code] ?? fallback;
  }
  return fallback;
}
