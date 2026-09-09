import { initializeApp, getApps, type FirebaseOptions } from "firebase/app";
import { getAuth } from "firebase/auth";

/**
 * Config pública de Firebase Web SDK — estos valores no son secretos (viajan
 * al browser en cualquier app de Firebase), pero sí son específicos del
 * proyecto. Se completan en apps/.env.local (ver placeholders ahí).
 *
 * `getAuth()` valida el formato de `apiKey` de forma síncrona al construirse
 * y tira `auth/invalid-api-key` si está vacío — eso rompería el render de
 * TODA la app (hasta la landing pública) mientras no se pegaron los valores
 * reales. Por eso el fallback "sin-configurar": con un string no vacío,
 * `getAuth()` no tira, y el error real recién aparece (contenido, en el
 * formulario) cuando alguien intenta loguearse de verdad.
 */
const SIN_CONFIGURAR = "sin-configurar";

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || SIN_CONFIGURAR,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || SIN_CONFIGURAR,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || SIN_CONFIGURAR,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || SIN_CONFIGURAR,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || SIN_CONFIGURAR,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || SIN_CONFIGURAR,
};

if (process.env.NEXT_PUBLIC_FIREBASE_API_KEY === undefined && typeof window !== "undefined") {
  console.warn(
    "Falta configurar Firebase: completá apps/.env.local con los valores reales del SDK Web (Consola de Firebase > Configuración del proyecto). El login no va a funcionar hasta entonces."
  );
}

const app = getApps().length > 0 ? getApps()[0]! : initializeApp(firebaseConfig);

export const auth = getAuth(app);
