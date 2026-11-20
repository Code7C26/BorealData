import { chmodSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { initializeApp, cert, getApps, type App, type ServiceAccount } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";

let app: App | null = null;

/**
 * Credenciales de administrador de Firebase, si están configuradas.
 *
 * Verificar ID tokens (lo que hacen todas las rutas autenticadas) alcanza con el id del
 * proyecto. Pero CAMBIAR datos de una cuenta —la contraseña nueva de "me olvidé la
 * contraseña"— necesita credenciales de administrador. Se pasan en
 * FIREBASE_ADMIN_CREDENTIALS (antes FIREBASE_SERVICE_ACCOUNT, que se sigue aceptando),
 * como JSON o en base64 (más cómodo en un .env: una sola línea sin comillas). Sirven dos
 * tipos de JSON:
 *
 *  - Una clave de cuenta de servicio (`"type": "service_account"`), la de la consola de
 *    Firebase → Cuentas de servicio → Generar nueva clave privada. Es lo ideal, pero en
 *    este proyecto la organización de Google Cloud la bloquea
 *    (`iam.disableServiceAccountKeyCreation`).
 *  - Las credenciales de un usuario de Google con acceso al proyecto
 *    (`"type": "authorized_user"`), las que deja
 *    `gcloud auth application-default login` en
 *    %APPDATA%\gcloud\application_default_credentials.json. No son una clave de servicio,
 *    así que la política no las bloquea. Identity Toolkit les exige un "proyecto de cuota":
 *    si el JSON no trae `quota_project_id`, se completa con FIREBASE_PROJECT_ID.
 *
 * Sin la variable, se usan las credenciales por defecto de Google
 * (GOOGLE_APPLICATION_CREDENTIALS, o la cuenta de servicio de Cloud Run): en un servidor
 * propio no hay ninguna, y la recuperación de contraseña responde 503.
 */
function leerCredenciales(): Record<string, unknown> | null {
  const crudo = (process.env.FIREBASE_ADMIN_CREDENTIALS ?? process.env.FIREBASE_SERVICE_ACCOUNT)?.trim();
  if (!crudo) return null;
  const json = crudo.startsWith("{") ? crudo : Buffer.from(crudo, "base64").toString("utf8");
  return JSON.parse(json) as Record<string, unknown>;
}

/** Si el backend tiene permisos para modificar cuentas (ver leerCredenciales). */
export function tieneCredencialesDeAdmin(): boolean {
  return Boolean(
    process.env.FIREBASE_ADMIN_CREDENTIALS?.trim() ||
      process.env.FIREBASE_SERVICE_ACCOUNT?.trim() ||
      process.env.GOOGLE_APPLICATION_CREDENTIALS
  );
}

/**
 * Las credenciales de usuario van por el camino de ADC (Application Default Credentials),
 * que es el que las sabe refrescar y mandar con el proyecto de cuota: se escriben en un
 * archivo temporal, legible solo por este proceso, y se apunta
 * GOOGLE_APPLICATION_CREDENTIALS ahí.
 */
function prepararCredencialesDeUsuario(credenciales: Record<string, unknown>, projectId: string) {
  const archivo = join(tmpdir(), "aletheia-firebase-adc.json");
  writeFileSync(archivo, JSON.stringify({ quota_project_id: projectId, ...credenciales }), {
    mode: 0o600,
  });
  chmodSync(archivo, 0o600);
  process.env.GOOGLE_APPLICATION_CREDENTIALS = archivo;
}

/**
 * Inicializa (o reutiliza) la app de Firebase Admin de forma perezosa — mismo patrón
 * que getClient() en gemini/geminiClient.ts y getPool() en db/pool.ts: no rompe el
 * arranque del server si FIREBASE_PROJECT_ID todavía no está seteada, recién falla
 * cuando una ruta necesita verificar un token de verdad.
 *
 * verifyIdToken() (sin `checkRevoked: true`) es una verificación criptográfica del JWT
 * contra las claves públicas de Google — no hace una llamada autenticada a la API de
 * Identity Toolkit, así que no necesita credenciales. Solo necesita que `projectId`
 * coincida con el proyecto de Firebase para validar el claim `aud` del token. Por eso se
 * pasa `projectId` de forma explícita en vez de dejar que el SDK lo infiera solo del
 * credential (con credenciales de usuario ADC, esa inferencia automática falla con
 * "Failed to determine project ID for Auth").
 */
function getFirebaseApp(): App {
  if (app) return app;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error(
      "Falta la variable de entorno FIREBASE_PROJECT_ID (ID del proyecto de Firebase, visible en la consola de Firebase → Configuración del proyecto)."
    );
  }

  const existing = getApps();
  if (existing.length > 0) {
    app = existing[0];
    return app;
  }

  const credenciales = leerCredenciales();
  if (credenciales?.type === "authorized_user") {
    prepararCredencialesDeUsuario(credenciales, projectId);
    // Sin `credential`: el SDK usa ADC, que ahora apunta al archivo de arriba.
    app = initializeApp({ projectId });
  } else if (credenciales) {
    app = initializeApp({ projectId, credential: cert(credenciales as ServiceAccount) });
  } else {
    app = initializeApp({ projectId });
  }

  return app;
}

export function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseApp());
}
