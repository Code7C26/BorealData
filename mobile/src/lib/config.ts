import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * De dónde sale la URL del backend.
 *
 * En la web alcanza `localhost:4000`, porque el browser corre en la misma
 * máquina que el backend. En el teléfono NO: `localhost` es el propio teléfono.
 * Pedirte que escribas tu IP de LAN en un `.env` cada vez que cambia el WiFi es
 * la forma más rápida de perder media hora, así que en desarrollo la deducimos:
 * `Constants.expoConfig.hostUri` es el host del servidor de Metro
 * ("192.168.0.14:8081"), es decir tu PC vista desde el teléfono. Le sacamos el
 * puerto de Metro y le ponemos el del backend.
 *
 * `EXPO_PUBLIC_API_URL`, si está definida, gana siempre: es la que va a tener
 * valor cuando el backend esté deployado.
 */
const PUERTO_BACKEND = 4000;

/**
 * El emulador de Android es una máquina virtual con su propia red: ahí
 * `localhost` es el emulador, no la PC que lo hospeda. La PC se alcanza por
 * `10.0.2.2`, un alias fijo que el emulador rutea a la loopback del host.
 *
 * Hace falta porque cuando Metro corre en modo localhost (es lo que pasa con el
 * emulador y con un teléfono por USB, donde Expo usa `adb reverse`), `hostUri`
 * viene como "localhost:8081" y deducir de ahí daría una URL que apunta al
 * propio emulador.
 *
 * En iOS no aplica: el simulador comparte la red de la Mac, así que ahí
 * `localhost` sí es la máquina de desarrollo.
 */
const LOOPBACK = new Set(['localhost', '127.0.0.1', '::1']);
const HOST_DESDE_EMULADOR_ANDROID = '10.0.2.2';

function urlDeDesarrollo(): string | null {
  const hostUri = Constants.expoConfig?.hostUri ?? Constants.expoGoConfig?.debuggerHost;
  if (!hostUri) return null;
  const host = hostUri.split(':')[0];
  if (!host) return null;
  if (Platform.OS === 'android' && LOOPBACK.has(host)) {
    return `http://${HOST_DESDE_EMULADOR_ANDROID}:${PUERTO_BACKEND}`;
  }
  return `http://${host}:${PUERTO_BACKEND}`;
}

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') ??
  urlDeDesarrollo() ??
  `http://localhost:${PUERTO_BACKEND}`;

/** Puerto en el que corre la web de `apps/` (`npm run dev` en Next.js). */
const PUERTO_WEB = 3000;

/**
 * Origen de la web, que es lo que arma el link público de un resultado al
 * compartirlo.
 *
 * Acá NO vale inventar un dominio por defecto: un link a un dominio que no
 * existe se ve igual de bien que uno que funciona, y el que lo recibe se come
 * un error. Por eso vale `null` mientras no haya un origen real, y la pantalla
 * de resultado esconde el botón de compartir en vez de ofrecer algo roto.
 *
 * En desarrollo se deduce del host de Metro, igual que `API_URL`: el link
 * apunta a la web corriendo en la misma máquina, que es verdad dentro de la red
 * local. `EXPO_PUBLIC_WEB_ORIGIN` lo pisa cuando la web esté deployada.
 */
function webDeDesarrollo(): string | null {
  const hostUri = Constants.expoConfig?.hostUri ?? Constants.expoGoConfig?.debuggerHost;
  const host = hostUri?.split(':')[0];
  if (!host || LOOPBACK.has(host)) return null;
  return `http://${host}:${PUERTO_WEB}`;
}

export const WEB_ORIGIN: string | null =
  process.env.EXPO_PUBLIC_WEB_ORIGIN?.replace(/\/$/, '') ?? webDeDesarrollo();

/** true cuando falta completar `.env.local` con los datos de Firebase. */
export const FIREBASE_SIN_CONFIGURAR = !process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
