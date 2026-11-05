# AletheIA — App móvil

App de AletheIA para iOS y Android: Expo SDK 58, React Native 0.88, Expo Router,
React 19.3 y TypeScript. Usa el mismo backend (`backend/`) y el mismo proyecto de
Firebase que la web, por lo que la cuenta y el historial son compartidos.

## Desarrollo

```bash
npm install
cp .env.example .env.local
npm start
```

La app se abre con **Expo Go** escaneando el QR que imprime `npm start`. No requiere
compilación: todos los módulos nativos que usa están incluidos en Expo Go. Si la
terminal indica "Using development build" en lugar de "Using Expo Go", hay un
`expo-dev-client` instalado que fuerza ese modo (la tecla `s` alterna entre ambos).

Requisitos de red: el teléfono y la computadora deben estar en la misma red local y sin
VPN activa, ya que el teléfono accede al servidor de desarrollo por la IP de la LAN.

La URL del backend no necesita configurarse en desarrollo: `src/lib/config.ts` la deduce
del host de Metro (por ejemplo, Metro en `192.168.0.14:8081` implica la API en
`192.168.0.14:4000`). En el emulador de Android usa `10.0.2.2`. La pantalla de Configuración
muestra la URL en uso.

Para ver la app en un navegador:

```bash
npx expo start --web --port 8082     # http://<IP-de-la-PC>:8082
```

En PowerShell con la política de ejecución por defecto, los wrappers `.ps1` de npm
fallan; se usa `npx.cmd` y `npm.cmd`.

## Scripts

| Comando | Descripción |
|---|---|
| `npm start` | Servidor de Expo. |
| `npm run android` / `npm run ios` / `npm run web` | Servidor de Expo abriendo la plataforma indicada. |
| `npm run typecheck` | Chequeo de tipos. |
| `npm run lint` | `expo lint`. |
| `npm run iconos` | Regenera los íconos desde el isotipo "Umbral" (`scripts/generar-iconos.mjs`). |

## Variables de entorno

`.env.local` (plantilla en `.env.example`):

| Variable | Descripción |
|---|---|
| `EXPO_PUBLIC_FIREBASE_*` | Configuración de Firebase; los mismos valores que la web. |
| `EXPO_PUBLIC_API_URL` | URL del backend desplegado. Vacía en desarrollo. |
| `EXPO_PUBLIC_WEB_ORIGIN` | Origen de la web, para los enlaces de compartir. Sin este valor se oculta el botón de compartir. |

Las variables `EXPO_PUBLIC_*` se incluyen en el bundle y no deben contener secretos.

## Builds con EAS

Necesarios solo si se agrega una librería con código nativo que Expo Go no incluye. El
perfil `development` de `eas.json` declara `developmentClient: true`, de modo que antes
debe instalarse el cliente:

```bash
npx expo install expo-dev-client
npx eas-cli@latest build --profile development --platform android
```

- EAS empaqueta desde la raíz del repositorio; `.easignore` (en la raíz) excluye el resto
  del monorepo y los secretos. `mobile/node_modules` no puede excluirse y eleva la
  subida a unos 800 MB, que conexiones inestables o VPN suelen cortar con `ECONNRESET`.
- `eas build:run -p android --latest` descarga e instala el último APK en el emulador
  activo.
- Un build propio para iPhone requiere el Apple Developer Program, o bien una Mac con
  Xcode.

### Emulador de Android sin Android Studio

1. JDK 17 o superior (requerido por `sdkmanager`).
2. Command-line tools del SDK de Android:
   ```bash
   sdkmanager "platform-tools" "emulator" "system-images;android-XX;google_apis;x86_64"
   avdmanager create avd -n aletheia -k "system-images;android-XX;google_apis;x86_64"
   ```
   La imagen `google_apis` alcanza; `google_apis_playstore` no es necesaria.
3. Instalar el APK de desarrollo con `eas build:run`.

Requisitos: virtualización habilitada en el firmware
(`(Get-CimInstance Win32_Processor).VirtualizationFirmwareEnabled`), un hipervisor
(Plataforma de hipervisor de Windows o Android Emulator Hypervisor Driver), unos 10 GB de
disco y, en equipos de 8 GB de RAM, limitar el AVD a `hw.ramSize=2048`.

## Estructura

| Ruta | Pantalla |
|---|---|
| `src/app/login.tsx`, `registro.tsx` | Autenticación con email y contraseña. |
| `src/app/(app)/index.tsx` | Verificar: enlace, texto, pregunta o captura. |
| `src/app/recorte.tsx` | Recorte de la captura antes de leerla. |
| `src/app/revision.tsx` | Revisión de la transcripción antes de verificar. |
| `src/app/analizando.tsx` | Espera del análisis. |
| `src/app/resultado/[id].tsx` | Veredicto, confianza, razonamiento y fuentes. |
| `src/app/(app)/historial.tsx` | Historial de la cuenta. |
| `src/app/(app)/configuracion.tsx` | Cuenta, apariencia, idioma, legales y borrado de datos. |
| `src/app/cuenta.tsx` | Datos de la cuenta. |
| `src/app/acerca-de.tsx` | Información del producto y del equipo. |

| Módulo | Descripción |
|---|---|
| `src/theme/tokens.ts` | Sistema de diseño V1: paleta y roles semánticos. |
| `src/lib/verdict.ts` | Vocabulario de veredictos; replica `apps/lib/verdict.ts`. |
| `src/lib/api.ts` | Cliente de la API con timeout; replica `apps/lib/api.ts`. |
| `src/lib/idioma.ts` | Castellano e inglés; replica `apps/lib/idioma.ts`. La preferencia se guarda en AsyncStorage. |
| `src/components/aurora.tsx` | Fondo animado, ejecutado en el hilo de UI. |
| `src/components/aurora-cortinas.tsx` | Animación de la pantalla de espera. |

## Criterios de implementación

- El veredicto nunca se comunica solo con color: el chip lleva ícono y etiqueta.
- `normalize()` degrada a `sin-datos` cualquier combinación veredicto × confianza fuera
  de tabla.
- La captura se transcribe y se revisa antes de emitir el veredicto.
- El fondo se anima siempre, incluso con "reducir movimiento" activado
  (`ReduceMotion.Never`); es una decisión de diseño.
- La animación de espera no usa filtros gaussianos, costosos en dispositivos móviles: el
  difuminado se obtiene apilando trazos con degradado.
- Las animaciones cíclicas usan una función seno sobre un reloj lineal; `valor % 1`
  produce un salto visible y `withRepeat(..., reverse)` recorta el recorrido de capas con
  desfase inicial.
- El recorte se aplica sobre la imagen original, antes de reducirla, para conservar el
  detalle del texto.
- Un `overflow: hidden` recorta también las áreas táctiles que sobresalen del contenedor;
  el marco de recorte separa la capa que recorta de la que recibe los gestos.

## Particularidades conocidas

- **Persistencia de sesión:** en React Native `getAuth()` no persiste la sesión; se usa
  `initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) })`.
  `firebase/auth` no declara `getReactNativePersistence` en sus tipos, por lo que la firma
  está declarada en `src/lib/firebase.ts`.
- **Permisos de Android:** el plugin de `expo-image-picker` agrega `RECORD_AUDIO` y
  `CAMERA`; ambos figuran en `android.blockedPermissions` porque la app solo selecciona
  imágenes de la galería.
- **Fotos de iCloud:** PHPicker falla con `Cannot load representation of type
  public.png` si la foto no está descargada; se resuelve con
  `preferredAssetRepresentationMode: Compatible`.
- **Rutas renombradas:** Expo Router mantiene en caché el árbol anterior; se reinicia
  Metro con `npx expo start --clear`.
- **`npm audit`:** las vulnerabilidades reportadas provienen de `@expo/cli`
  (herramienta de desarrollo) y de `@firebase/firestore`, que no se importa ni se
  empaqueta. `npm audit fix --force` modifica la versión de `expo` y no debe ejecutarse.
- **Borrado de datos:** los endpoints de borrado responden 503 hasta aplicar
  `backend/migrate-delete.ts`.

## Pendiente

- Recibir contenido compartido desde otras apps (intent `ACTION_SEND` en Android y
  extensión de compartir en iOS).
- Notificación al finalizar un análisis largo.
