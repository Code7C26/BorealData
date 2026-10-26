import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp, type FirebaseOptions } from 'firebase/app';
import * as FirebaseAuth from 'firebase/auth';
import { getAuth, initializeAuth, type Auth, type Persistence } from 'firebase/auth';
import { Platform } from 'react-native';

/**
 * `getReactNativePersistence` existe solo en el build de React Native de
 * firebase/auth, y los typings publicados del paquete apuntan al build de
 * browser: el símbolo está en tiempo de ejecución (Metro resuelve
 * `@firebase/auth` por su condición "react-native") pero TypeScript no lo ve.
 * Por eso la firma se declara acá en vez de importarla.
 */
const { getReactNativePersistence } = FirebaseAuth as unknown as {
  getReactNativePersistence?: (almacenamiento: unknown) => Persistence;
};

/**
 * Config pública de Firebase — mismos valores que `apps/.env.local` (es el
 * mismo proyecto: la cuenta que creaste en la web entra en la app). No son
 * secretos, pero sí específicos del proyecto, así que viven en `.env.local`.
 *
 * `SIN_CONFIGURAR` es el mismo truco que en la web: con un string no vacío,
 * construir Auth no tira `auth/invalid-api-key`, y el error real aparece
 * contenido en el formulario de login en vez de romper el arranque de la app.
 */
const SIN_CONFIGURAR = 'sin-configurar';

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || SIN_CONFIGURAR,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || SIN_CONFIGURAR,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || SIN_CONFIGURAR,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || SIN_CONFIGURAR,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || SIN_CONFIGURAR,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || SIN_CONFIGURAR,
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

/**
 * Acá está la única diferencia de fondo con `apps/lib/firebase.ts`.
 *
 * `getAuth()` en React Native guarda la sesión en memoria: la app se cierra y
 * hay que volver a loguearse, que en un teléfono es inaceptable. La sesión
 * persistente se pide explícitamente con `initializeAuth` +
 * `getReactNativePersistence(AsyncStorage)`.
 *
 * `initializeAuth` tira si Auth ya fue inicializado, y con Fast Refresh este
 * módulo se re-evalúa, así que el catch cae a `getAuth()` sobre la instancia ya
 * creada — no es un error, es el segundo render del mismo arranque.
 */
function crearAuth(): Auth {
  if (Platform.OS === 'web' || !getReactNativePersistence) return getAuth(app);
  try {
    return initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
  } catch {
    return getAuth(app);
  }
}

export const auth = crearAuth();
