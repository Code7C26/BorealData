"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFirebaseAuth = getFirebaseAuth;
const app_1 = require("firebase-admin/app");
const auth_1 = require("firebase-admin/auth");
let app = null;
/**
 * Inicializa (o reutiliza) la app de Firebase Admin de forma perezosa — mismo patrón
 * que getClient() en gemini/geminiClient.ts y getPool() en db/pool.ts: no rompe el
 * arranque del server si FIREBASE_PROJECT_ID todavía no está seteada, recién falla
 * cuando /analyze necesita verificar un token de verdad.
 *
 * Usa applicationDefault(): reutiliza las mismas credenciales ADC generadas con
 * `gcloud auth application-default login` (ya configuradas para el conector de Cloud
 * SQL, ver db/pool.ts). No hace falta descargar una clave de service account — sigue
 * bloqueado por la política de organización `iam.disableServiceAccountKeyCreation`
 * (ver troubleshooting de Cloud SQL en el contexto del proyecto).
 *
 * verifyIdToken() (sin `checkRevoked: true`) es una verificación criptográfica del JWT
 * contra las claves públicas de Google — no hace una llamada autenticada a la API de
 * Identity Toolkit, así que no necesita ningún rol IAM especial. Solo necesita que
 * `projectId` coincida con el proyecto de Firebase para validar el claim `aud` del
 * token. Por eso se pasa `projectId` de forma explícita en vez de dejar que el SDK lo
 * infiera solo del credential (con credenciales de usuario ADC, esa inferencia
 * automática falla con "Failed to determine project ID for Auth").
 */
function getFirebaseApp() {
    if (app)
        return app;
    const projectId = process.env.FIREBASE_PROJECT_ID;
    if (!projectId) {
        throw new Error("Falta la variable de entorno FIREBASE_PROJECT_ID (ID del proyecto de Firebase, visible en la consola de Firebase → Configuración del proyecto).");
    }
    const existing = (0, app_1.getApps)();
    app =
        existing.length > 0
            ? existing[0]
            : (0, app_1.initializeApp)({
                credential: (0, app_1.applicationDefault)(),
                projectId,
            });
    return app;
}
function getFirebaseAuth() {
    return (0, auth_1.getAuth)(getFirebaseApp());
}
