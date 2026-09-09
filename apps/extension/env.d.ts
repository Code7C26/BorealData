/// <reference types="vite/client" />

// Declaración manual porque `wxt prepare` no conoce de antemano las env vars
// custom del proyecto (ver .wxt/types/globals.d.ts, que sí es autogenerado
// y no hay que tocar a mano). Interface merge global con esa misma
// `ImportMetaEnv` — hace falta que este archivo no tenga imports/exports
// para que TS lo trate como ambient global y no como módulo.
interface ImportMetaEnv {
  readonly WXT_API_URL: string;
  readonly WXT_WEB_ORIGIN: string;
  readonly WXT_FIREBASE_API_KEY: string;
}
