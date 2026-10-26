# AletheIA — app móvil

La tercera superficie de AletheIA, además de la web y la extensión de Chrome.
Expo SDK 58 (React Native 0.88, Expo Router 58, React 19.3), TypeScript.

Pega contra el **mismo backend** que la web (`backend/`) y usa el **mismo
proyecto de Firebase**: la cuenta que creaste en la web entra en la app, y los
análisis que hacés acá aparecen en el historial de la web.

---

## Correrla

### 1. El backend tiene que estar andando

```bash
cd backend
npm run dev
```

### 2. El servidor de desarrollo

```bash
cd mobile
npx expo start
```

**No hace falta escribir la IP de tu PC en ningún lado.** `src/lib/config.ts`
deduce la URL del backend del host de Metro: si el teléfono ve a tu PC en
`192.168.0.14:8081`, la API queda en `192.168.0.14:4000`. El teléfono y la PC
tienen que estar en la misma red. La pantalla de Perfil muestra abajo contra qué
URL está pegando, que es lo primero que hay que mirar cuando "no anda".

### 3. En el teléfono: hace falta un *development build*

El Expo Go de la tienda todavía no soporta SDK 58 (sale "en unas semanas" desde
el 15-oct-2026), así que la app necesita su propio build. Se compila en la nube,
no hace falta Android Studio:

```bash
npx eas-cli@latest login     # cuenta gratis de Expo
npx eas-cli@latest init      # crea el proyecto y escribe el projectId en app.json
npx eas-cli@latest build --profile development --platform android
```

El proyecto ya está creado: **[@renlanata/aletheia](https://expo.dev/accounts/renlanata/projects/aletheia)**.

> **En PowerShell escribí `npx.cmd` y `npm.cmd`**, no `npx` y `npm`. Con la
> política de ejecución de scripts deshabilitada (el default de Windows), los
> wrappers `.ps1` fallan con *"no se puede cargar el archivo npx.ps1"*. El `.cmd`
> la esquiva. Se arregla de raíz con
> `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.

Cuando termina (10-20 min la primera vez) deja un link para bajar el APK al
teléfono. **Se instala una sola vez:** después, `npx expo start` y el teléfono
recarga el JavaScript igual que Expo Go. Solo hay que volver a compilar cuando
se agrega una librería con código nativo.

### Emulador de Android en la PC (sin Android Studio)

El camino liviano: nada de IDE ni de compilar en local — solo el emulador, y
adentro se instala el APK que compiló EAS en la nube. Así nos salteamos el NDK y
las cachés de Gradle, que son los pedazos más grandes del toolchain.

Hace falta, en este orden:

1. **Un JDK 17 o más nuevo** (~200 MB). El `sdkmanager` es un programa Java y no
   corre con el JRE 8. Temurin 17 sirve.
2. **Las *command-line tools* del SDK de Android** (~150 MB), y con ellas:
   ```bash
   sdkmanager "platform-tools" "emulator" "system-images;android-XX;google_apis;x86_64"
   avdmanager create avd -n aletheia -k "system-images;android-XX;google_apis;x86_64"
   ```
   La versión de `android-XX` sale de `sdkmanager --list`: conviene la imagen
   **`google_apis`** y no la `google_apis_playstore`, que pesa más y no hace falta.
3. **El APK de desarrollo**, de EAS (ver arriba), instalado con
   `eas build:run -p android --latest`, que lo baja y lo mete en el emulador que
   esté corriendo.

Después, `npm start` y el emulador recarga el JavaScript igual que un teléfono.

**Requisitos reales de la máquina**, que conviene mirar ANTES de descargar nada:

- **Virtualización activada en el firmware.** Es el requisito duro; sin eso el
  emulador va por software y es inusable. Se chequea con
  `(Get-CimInstance Win32_Processor).VirtualizationFirmwareEnabled`.
- Un *hypervisor*: o la característica de Windows "Plataforma de hipervisor de
  Windows", o el driver propio de Google
  (`sdkmanager --install "extras;google;Android_Emulator_Hypervisor_Driver"`).
- **RAM.** Con 8 GB en la máquina, al emulador hay que darle 2 GB y no más
  (`hw.ramSize=2048` en el `config.ini` del AVD), y aun así va a ir lento con
  Metro y el navegador abiertos.
- **Disco:** entre el SDK, la imagen y el disco virtual del AVD (que crece con el
  uso) hay que contar unos 10 GB.

**En el emulador, `localhost` es el emulador**, no la PC: la máquina anfitriona se
alcanza por `10.0.2.2`. `src/lib/config.ts` ya lo contempla, no hay nada que
configurar.

### iPhone

La app está escrita para las dos plataformas (no hay nada específico de Android
en el código), pero **probarla en un iPhone es más caro que en Android**:

| Camino | Qué hace falta | Costo |
|---|---|---|
| **Esperar el Expo Go de SDK 58** | Nada: se escanea el QR | Gratis |
| EAS Build en un iPhone propio | Apple Developer Program | USD 99/año |
| Xcode con un Apple ID gratis | Una Mac, cable, y recompilar cada 7 días | Gratis, pero necesita Mac |
| Simulador de iOS | Una Mac con Xcode | Gratis, pero necesita Mac |

**El primero es el que conviene.** La app no usa ningún módulo nativo fuera de
los que Expo Go ya trae (router, reanimated, svg, image-picker, async-storage,
gradient, clipboard, haptics; Firebase es JavaScript puro), así que en cuanto
salga el Expo Go de SDK 58 debería correr ahí tal cual, en iPhone y en Android,
sin compilar nada.

---

## Qué hay adentro

| Ruta | Pantalla |
|---|---|
| `src/app/login.tsx`, `registro.tsx` | Email y contraseña (igual que la web) |
| `src/app/(app)/index.tsx` | Verificar: enlace, texto o captura |
| `src/app/revision.tsx` | Lo que el modelo leyó de la captura, para corregir antes de verificar |
| `src/app/analizando.tsx` | La espera, con los pasos reales del backend |
| `src/app/resultado/[id].tsx` | Veredicto, confianza, razonamiento y fuentes |
| `src/app/(app)/historial.tsx` | Todo lo verificado con esa cuenta |
| `src/app/(app)/perfil.tsx` | Cuenta, tema, borrado de datos |

| Módulo | Qué es |
|---|---|
| `src/theme/tokens.ts` | El Design System V1 portado: paleta cruda + roles semánticos |
| `src/lib/verdict.ts` | Espejo de `apps/lib/verdict.ts` y de `backend/src/gemini/types.ts` |
| `src/lib/api.ts` | Espejo de `apps/lib/api.ts`, con timeout (en celular la red se corta) |
| `src/components/aurora.tsx` | El fondo animado, en el hilo de UI |

### Reglas que se mantienen del resto del producto

- **El veredicto nunca es color solo:** el chip siempre lleva ícono y etiqueta.
- **`normalize()` es la última defensa:** una combinación veredicto × confianza
  fuera de tabla se degrada a `sin-datos` en vez de mostrar una contradicción.
- **La captura se transcribe primero y la persona corrige**, y recién después se
  emite el veredicto — igual que el side panel de la extensión.
- **El fondo se anima siempre**, incluso con "reducir movimiento" activado: es
  una decisión de diseño tomada, no un descuido (está igual en la web).

---

## Configuración

`mobile/.env.local` (ya está creado, copiado de `apps/.env.local`):

```
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
EXPO_PUBLIC_FIREBASE_APP_ID=...
# EXPO_PUBLIC_API_URL=      ← solo cuando el backend esté deployado
# EXPO_PUBLIC_WEB_ORIGIN=   ← el origen de la web, para los links que se comparten
```

---

## Trampas que ya nos encontramos

- **La sesión no persiste con `getAuth()` en React Native.** Hay que pedirla con
  `initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) })`
  (`src/lib/firebase.ts`).
- **`firebase/auth` no declara `getReactNativePersistence` en sus typings**: el
  símbolo existe en el build de React Native, pero los tipos publicados son los
  del build de browser. Por eso la firma está escrita a mano en `firebase.ts`.
- **`localhost` en el teléfono es el teléfono**, no tu PC: de ahí el truco del
  host de Metro en `config.ts`.
- **`npm audit` reporta 9 vulnerabilidades "high" y no hay nada que hacer.**
  Son tres raíces, las tres en cosas que NO viajan en el APK: `node-forge` y
  `zod` entran por `@expo/cli` (herramienta de desarrollo), y `@grpc/grpc-js`
  por `@firebase/firestore`, que está en el paquete `firebase` pero nunca se
  importa — la app solo usa `firebase/app` y `firebase/auth`, así que Metro no
  lo empaqueta. **No correr `npm audit fix --force`**: toca la versión de `expo`
  y rompe el proyecto.
- **`eas init` mete un permiso de micrófono en `app.json`.** El plugin de
  `expo-image-picker` agrega `RECORD_AUDIO` y `CAMERA` por si grabás video; la
  app solo elige imágenes de la galería, así que los dos están en
  `android.blockedPermissions`. Pedir el micrófono en un detector de noticias
  falsas es exactamente la clase de cosa que hace desconfiar.
- **Los botones de borrar contestan 503 hasta que corra `backend/migrate-delete.ts`.**
  No es un bug de la app: el rol `aletheia_app` arranca sin permiso de DELETE.
  Es el mismo pendiente que tiene la web.
- **Los íconos se generan**, no se editan a mano: `npm run iconos` los redibuja
  desde el isotipo "Umbral" (`scripts/generar-iconos.mjs`). Se corre solo cuando
  cambia la marca; las piezas quedan commiteadas.

## Lo que falta

- **Recibir "Compartir" de otras apps.** Es *la* función que justifica una app
  nativa: mandar un enlace desde WhatsApp o Chrome directo a AletheIA. Necesita
  un intent filter de `ACTION_SEND` y una librería para leer lo compartido.
- **Notificación cuando termina un análisis largo**, para poder salir de la app
  mientras tanto.
- Idioma: la app arranca solo en castellano; la web ya tiene es/en.
