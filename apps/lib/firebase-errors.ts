import { FirebaseError } from "firebase/app";
import { traducciones, type Idioma } from "@/lib/idioma";

const MENSAJES_POR_CODIGO = traducciones<Record<string, string>>({
  es: {
    "auth/invalid-email": "El email ingresado no es válido.",
    "auth/user-disabled": "Esta cuenta fue deshabilitada.",
    "auth/user-not-found": "No encontramos una cuenta con ese email.",
    "auth/wrong-password": "La contraseña es incorrecta.",
    "auth/invalid-credential": "Email o contraseña incorrectos.",
    "auth/email-already-in-use": "Ya existe una cuenta con ese email.",
    "auth/weak-password": "La contraseña debe tener al menos 8 caracteres.",
    "auth/too-many-requests": "Demasiados intentos. Probá de nuevo en unos minutos.",
    "auth/network-request-failed": "Problema de conexión. Revisá tu internet e intentá de nuevo.",
  },
  en: {
    "auth/invalid-email": "That email address isn't valid.",
    "auth/user-disabled": "This account has been disabled.",
    "auth/user-not-found": "We couldn't find an account with that email.",
    "auth/wrong-password": "The password is incorrect.",
    "auth/invalid-credential": "Incorrect email or password.",
    "auth/email-already-in-use": "An account with that email already exists.",
    "auth/weak-password": "The password must be at least 8 characters long.",
    "auth/too-many-requests": "Too many attempts. Try again in a few minutes.",
    "auth/network-request-failed": "Connection problem. Check your internet and try again.",
  },
});

export function mensajeErrorFirebase(err: unknown, fallback: string, idioma: Idioma = "es"): string {
  if (err instanceof FirebaseError) {
    return MENSAJES_POR_CODIGO[idioma][err.code] ?? fallback;
  }
  return fallback;
}
