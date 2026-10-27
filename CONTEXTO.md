# Contexto del Proyecto — AletheIA / Boreal Data

> Documento de continuidad. Se actualiza a medida que avanza el proyecto para no perder contexto entre sesiones.

**Última actualización:** 26 de octubre de 2026 (arranca la app móvil de verdad: `mobile/` con Expo SDK 58, abierta con Expo Go — ver sección 14)

---

## 1. Información General

| Campo | Detalle |
|---|---|
| Empresa | Boreal Data |
| Producto | AletheIA |
| Concepto | Detector de noticias falsas con IA, verificación de fuentes y análisis de contenido |
| Formatos | Web + Extensión de Chrome + App móvil (Expo) |
| Contexto | Proyecto Final de Secundaria (FAT 2026) |
| Fechas | **Entrega del MVP: mediados de noviembre 2026.** Presentación: diciembre 2026 — lo que se sume entre una y otra suma a la nota final |
| Equipo | 2 integrantes — **Renzo Lanata** (frontend/diseño) y **Ciro Di Marsico** (backend/scraping/IA/infra) |
| Materia | FAT 7C 2026 — Profesora: Tamara Piccinni |
| Repositorio | github.com/Code7C26/BorealData |
| Rama de Renzo | `rama-RenzoLanata` |

---

## 2. Stack Tecnológico

### Frontend

| Plataforma | Tecnología |
|---|---|
| Web | Next.js (TypeScript), App Router |
| Extensión Chrome | WXT + Manifest V3 + React (side panel, no popup) |
| Mobile | Expo SDK 58 + React Native 0.88 + Expo Router (TypeScript) — en `mobile/` |
| Hosting | Firebase Hosting |
| Auth | Firebase Auth (Google) + JWT hacia el backend |

### Backend

| Componente | Tecnología |
|---|---|
| API REST | Cloud Run — Node.js + Express (TypeScript) |
| Scraper | Cheerio (estático) → Puppeteer (con JS) |
| Motor IA | Gemini API (Vertex AI, con grounding vía Google Search) |
| Base de datos | Cloud SQL — PostgreSQL |
| Seguridad DB | Row Level Security (rol `aletheia_app` sin privilegios de owner, policies por usuario) |

---

## 3. Estructura del Repositorio (real, verificada)

```
BorealData/
│
├── apps/                     → Next.js (TypeScript), corre desde acá (no "apps/web/")
│   ├── app/
│   │   ├── (autenticado)/    → dashboard, historial, analizando, resultado, perfil, configuracion, contacto
│   │   ├── login/, registro/
│   │   └── resultado/[id]/   → vista pública de un análisis compartido
│   ├── components/           → navbar, sidebar, hero, aurora, faq, quiz-deteccion, quienes-somos, etc.
│   ├── lib/                  → api.ts, auth-context.tsx, firebase.ts, verdict.ts, theme.ts, extension-bridge.ts
│   ├── entrypoints/          → entrypoints de la extensión (WXT)
│   ├── extension/            → build/salida de la extensión (.output/)
│   └── public/
│
├── mobile/                   → App móvil (Expo SDK 58). Carpeta propia, NO dentro de apps/:
│   ├── src/app/              → rutas de Expo Router (login, (app)/, resultado/[id], …)
│   ├── src/lib/              → api.ts, verdict.ts, firebase.ts, auth.tsx, config.ts
│   ├── src/theme/            → el Design System V1 portado a React Native
│   └── src/components/       → aurora, ui, veredicto, marca
│
├── backend/
│   └── src/
│       ├── auth/, db/, gemini/, routes/, scraper/, utils/
│   (+ migrate.ts, migrate-rls.ts, verify-rls.ts en la raíz de backend/)
│
├── design/            → DESIGN_SYSTEM.md, wireframes
├── docs/ (= DOCS/)    → PDFs de identidad, brainstorms, FODA, stack tecnológico
└── assets/
```

La extensión y la web comparten el mismo `apps/` (no está separada en `apps/web` y `apps/extension` como carpetas independientes de código; `apps/extension/` es la carpeta de salida del build de WXT).

---

## 4. Identidad Visual — Design System V1 (rediseño de cero, 11-sep-2026)

El 11 de septiembre de 2026 se rediseñó **todo** el frontend contra dos PDFs de Renzo: *"AletheIA Identidad"* (marca V1) y *"AletheIA Sistema"* (design system V1.0). No fue un retoque — cambió el contrato del análisis, la paleta, la tipografía y todas las pantallas. **Esto reemplaza la paleta navy/blue que se había usado hasta esa fecha.**

### Paleta actual
| Nombre | Uso |
|---|---|
| Noche `#0B100F` | Fondo |
| Violeta Aurora `#7A5AF8` / `#B9A4FF` | Acento principal |
| Luz Boreal `#F2E8D5` | Acento cálido |

- Tokens en `apps/app/global.css`, en dos capas (paleta cruda + roles semánticos). Ningún componente usa un hex suelto.
- Tipografía: **Archivo** (titulares) + **IBM Plex Sans/Mono**, base 1rem = 17px.
- Modo claro obligatorio, controlado con `data-theme` en `<html>` (`apps/lib/theme.ts`).

### Preferencia de diseño de Renzo (sigue vigente)
Pide que el diseño "se la juegue": glows marcados, gradientes, movimiento — lo prolijo-pero-sutil para él equivale a "no cambió nada". El fondo se anima **siempre**, incluso con "reducir movimiento" activado en el sistema (decisión suya, documentada en un comentario en `global.css`, no es un descuido de accesibilidad). El sidebar tiene que tener vida propia pero sin igualarse al área de contenido.

### Gotchas de Tailwind v4 (el sistema venía pensado para v3)
- `--spacing-*` y `--container-*` comparten namespace: tener `--spacing-card: 32px` hacía que `max-w-card` resolviera a 32px en vez de 720.
- `max-w-prose` es una utilidad con valor propio, no se puede pisar desde el tema.
- `@apply` solo acepta utilidades, no otras clases de componente propias.
- Tailwind v4 no genera clases armadas en runtime (`.replace('border-t-','border-l-')` nunca produce la clase real — hay que escribirlas enteras en `lib/verdict.ts`).

---

## 5. Cambio de contrato del análisis: veredictos + confianza

Se eliminó el **score 0-100**. Ahora el análisis devuelve:
- **4 veredictos:** `verificado` / `dudoso` / `falso` / `sin-datos`
- **5 niveles de confianza:** 1 a 5 (por separado — el veredicto habla de la nota, la confianza de qué tan sólida es la evidencia)

Regla dura: `sin-datos` nunca pasa de 2, y `falso`/`verificado` nunca bajan de 3. Una combinación fuera de tabla degrada a `sin-datos` (`normalizeVerdict` en el backend, `normalize` en `apps/lib/verdict.ts`, más una CHECK constraint en la DB).

- Vocabulario del front: `apps/lib/verdict.ts` (espejo de `backend/src/gemini/types.ts`).
- Card de resultado y sus 5 estados: `apps/components/result/` (o equivalente en `resultado/page.tsx`).
- Migración de DB (`backend/src/db/schema.sql`, columnas `verdict`, `confidence`, `headline`, `lead_text`, `reasoning`) — **ya corrida** sobre el Postgres local de Renzo (14 filas viejas intactas, se traducen al leerlas en `analysesRepository.ts::mapAnalysisRow`).

---

## 6. Extensión de Chrome: de popup a side panel

La extensión dejó de ser un popup y ahora es un **side panel** (`chrome.sidePanel`), como la de Claude: se ancla a la derecha y no se cierra al perder foco. Entrypoint de WXT: `entrypoints/sidepanel/` (antes `entrypoints/popup/`).

**Gotcha importante:** `chrome.sidePanel.close()` llamado desde el propio panel no cierra nada (resuelve la promesa pero no hace nada visible). La forma que funciona es llamarlo **desde el background script** (`entrypoints/background.ts`), escuchando un evento como `tabs.onActivated` — `close()`, a diferencia de `open()`, no requiere gesto directo del usuario.

**Resuelto (14-sep-2026):** el botón "Ver análisis completo" ya apunta a `${WEB_ORIGIN}/resultado/${id}` (`extension/entrypoints/sidepanel/App.tsx`), con fallback a `/historial` solo si el guardado no devolvió id.

---

## 7. Seguridad del backend (hardening, 13-sep-2026)

Se hizo una pasada de seguridad completa sobre el backend:
- **SSRF:** `POST /analyze` valida la URL (protocolo, IPs privadas/internas, resolución DNS incluyendo rebinding) antes de scrapear (`backend/src/utils/validateUrl.ts`).
- Límites de longitud en `url` (`/analyze`) y `fullName` (`/me`).
- Sanitización de caracteres de control en `fullName`, `url` y en el texto/título scrapeado (`backend/src/utils/sanitize.ts`).
- **Rate limit:** 20 análisis nuevos por hora por usuario en `/analyze` (no cuenta cache hits), en memoria, sin dependencias nuevas (`backend/src/utils/rateLimiter.ts`).
- **Row Level Security en Postgres:** rol de aplicación `aletheia_app` sin privilegios de owner, policies para que cada usuario solo acceda a sus propias filas (`users`/`analyses`), con excepciones explícitas para compartir resultado, la caché de análisis por URL y el agregado público de `/stats`. Scripts: `backend/migrate-rls.ts` / `backend/verify-rls.ts`.
- `apps/extension/.gitignore` ahora excluye `.env*` (antes faltaba, a diferencia de `apps/` y `backend/`).

---

## 8. Estado actual del frontend web

### Pantallas desarrolladas
- ✅ Home (`app/page.tsx`) — navbar, hero, input URL/texto, stats bar, quiz de detección, FAQ, footer
- ✅ Login / Registro (`app/login`, `app/registro`)
- ✅ Dashboard, Historial, Analizando, Resultado, Perfil, Configuración, Contacto — todo bajo `app/(autenticado)/`
- ✅ Resultado compartido por id (`app/resultado/[id]/`), con preview de Open Graph / Twitter Card real (`generateMetadata()`, pega contra `GET /analyses/:id`) — antes compartir el link por WhatsApp/redes no mostraba nada porque los crawlers no ejecutan JS.

### Bugs resueltos recientes (bitácora completa en memoria de sesión, no repetir diagnóstico)
- Botón "Compartir resultado" ahora da feedback visual ("¡Enlace copiado!"), con manejo de error si `navigator.clipboard` no existe.
- Botón "Volver al historial" ahora es sticky en la vista de resultado — arreglado un bug real de `overflow-hidden` en el div raíz de `components/sidebar.tsx` que rompía `position: sticky` (y podía romper `fixed`) en cualquier página autenticada. Se sacó el `overflow-hidden` a un wrapper propio, más chico, solo para las capas decorativas.
- Vista de error del resultado ya no muestra el botón de compartir (no aplica).
- Historial y link de compartir rotos → causa raíz era que faltaba correr la migración de DB (columnas nuevas de veredicto/confianza). Ahora hay `backend/migrate.ts`, idempotente.
- El borrador de `sessionStorage` del análisis anterior ya no queda pegado al volver a analizar (`limpiarBorrador()`).
- Íconos de la app regenerados desde la geometría del isotipo "Umbral" con Pillow.
- **Bug de sesión al usar la extensión (resuelto):** el login usaba persistencia por pestaña (`browserSessionPersistence`) por defecto, y una pestaña nueva sin sesión disparaba un logout que además le borraba la sesión a la extensión. Fix en el checkbox de "recordarme" (default `true`) y en `extension-bridge.ts` (solo desloguea la extensión ante una transición real usuario→null).
- Filas viejas de análisis perdían el razonamiento por un `DEFAULT '[]'` mal puesto en la migración; y `averageConfidence` daba 0 por no contemplar filas viejas sin `confidence` — ambos corregidos.

### Bug de las fuentes no clickeables — RESUELTO (8-oct-2026)
La causa no era que el cruce fuera flojo: era que comparaba contra el hostname de una URL
de redirección que es igual para todas las fuentes. Ver sección 13.

---

## 9. Flujo de trabajo Git

```bash
# Subir cambios
git add .
git commit -m "tipo(scope): descripción #NúmeroIssue"
git push origin rama-RenzoLanata
```

| Tipo | Uso |
|---|---|
| feat | Nueva funcionalidad |
| fix | Corrección de error |
| design | Cambios de diseño/UI |
| docs | Documentación |
| style | Formato, espacios |
| refactor | Reestructuración |

### Cómo correr el proyecto localmente
```bash
cd C:\Users\Usuario\BorealData\apps
npm run dev
# Abre en http://localhost:3000
```
La extensión corre con `npm run dev` (WXT) desde la misma carpeta y se carga "unpacked" en `chrome://extensions` desde `apps/extension/.output/chrome-mv3-dev`. Tiene hot-reload, salvo `background.ts`, que requiere recargar la extensión a mano.

---

## 10. Análisis de Competencia

- **NewsGuard** — Pago, calificación humana, sin análisis de texto con IA
- **Ground News** — Freemium, sin IA, centrado en EE. UU.
- **InVID / WeVerify** — Gratuito, solo extensión, orientado a periodistas
- **Our.News** — Gratuito, crowdsourcing, susceptible a manipulación
- **Logically** — Más similar a AletheIA, pero abandonó al usuario final en 2025
- **Google Fact Check Explorer** — Gratuito, solo busca claims ya verificados

**Diferenciadores de AletheIA:** enfoque Latam/español primero, IA como núcleo (no complemento), análisis transparente (muestra el razonamiento, no solo el veredicto), MVP 100% gratuito.

---

## 11. Documentos generados

| Documento | Descripción |
|---|---|
| `docs/Analisis_Competencia_AletheIA.pdf` | Tabla comparativa de competidores |
| `docs/BRAINSTORM_empresa.pdf` / `BRAINSTORM_producto.pdf` | Brainstorms iniciales |
| `docs/FODA.png` | FODA del equipo |
| `docs/MVP-BorealData.pdf` | Definición del MVP |
| `docs/TECHNOLOGICAL_STACK.pdf` | Stack tecnológico |
| `docs/validacion y empatia.pdf` | Mapa de empatía del usuario |
| `docs/reporte-cierre-mes-aletheia.pdf` | Reporte de cierre de mes |
| `design/DESIGN_SYSTEM.md` | Design System V1 en código |

---

## 12. Pendientes inmediatos

- [ ] **Correr `backend/migrate-delete.ts`** — sin eso, borrar un análisis o la cuenta
      responde 503. Ver sección 13.
- [ ] **Nada está deployado todavía.** No hay Dockerfile, ni `firebase.json`, ni CI, y
      `NEXT_PUBLIC_API_URL` apunta a `localhost:4000`. Es el pendiente más grande: la
      entrega es a mediados de noviembre y hoy el producto solo corre en la máquina de
      Renzo. Es lo que desbloquea todo lo demás: sin una URL pública, el APK de Android
      no sirve fuera de la red de casa, la PWA de iOS es imposible, los links de
      "compartir resultado" no le funcionan a nadie más, y la profesora no puede probarlo.
- [ ] El `development` de `eas.json` quedó sin `expo-dev-client` (se sacó al probar
      SDK 57 y no se repuso). Si alguna vez hace falta un build propio:
      `npx.cmd expo install expo-dev-client` antes de compilar.
- [ ] En la app móvil falta recibir el "Compartir" de otras apps (intent `ACTION_SEND`),
      que es lo que la hace más útil que la web en el teléfono.
- [ ] Seguir la bitácora de bugs de frontend a medida que Renzo reporte nuevos.

---

## 13. Pasada de calidad de producto (8-oct-2026)

### Privacidad y legales
- `apps/components/analisis-input.tsx` decía **"No guardamos lo que analizás"** y era
  falso: los análisis se guardan en el historial y los de enlaces se reusan entre
  cuentas. Ahora dice lo que el backend hace de verdad y linkea al detalle.
- Nuevas páginas públicas **`/privacidad`** y **`/terminos`**, escritas contra el código
  (qué se guarda, qué no, que el contenido viaja a Gemini, qué ve un tercero con el link
  de compartir). Linkeadas desde el pie y desde el registro. Las pedían Firebase Auth y
  la Chrome Web Store, y no existían.
- **`/contacto` dejó de estar detrás del login.** Estaba en `(autenticado)/` y el pie de
  la landing linkeaba ahí, así que a un visitante lo rebotaba a `/login`. Vive en el
  grupo nuevo `app/(info)/`, cuyo layout pone el sidebar si hay sesión.

### Borrado de datos (hace verdadera la política)
- `DELETE /analyses/:id`, `DELETE /history` y `DELETE /me` (cuenta + análisis, en una
  transacción). Botón de borrar en cada fila del historial y en la pantalla de resultado.
- **Requiere `backend/migrate-delete.ts`:** el rol `aletheia_app` arrancaba con
  SELECT/INSERT/UPDATE y sin DELETE. La migración agrega el GRANT y las policies
  `analyses_delete_own` / `users_delete_own`. Hay que correrla con el DUEÑO de las tablas
  (no con el rol de la app), y acepta `MIGRATION_DATABASE_URL` para no tener que editar
  el `.env`. Mientras no corra, los tres endpoints responden **503 con el mensaje que lo
  dice**, no un 500 sin explicación.

### El cruce de fuentes con grounding (el bug de "solo la primera fuente es clickeable")
Causa raíz, medida contra la API real: **`groundingChunks[].web.uri` es SIEMPRE un
redirect de `vertexaisearch.cloud.google.com`, y el dominio del medio viene en
`web.title`.** El código comparaba el dominio que escribía el modelo contra el hostname
de esa URL, que es el mismo para todas las fuentes, así que el cruce por dominio no podía
acertar nunca — solo pegaba de casualidad el fallback por título. Y cuando pegaba,
mostraba `vertexaisearch.cloud.google.com` como dominio de la fuente.

Medido en la base local: de **430 fuentes guardadas, 44 tenían link (10%)** y las 430
mostraban el host de redirección como dominio.

- El cruce ahora va contra `web.title` y el dominio que se muestra sale de ahí
  (`toGroundingLink` en `geminiClient.ts`). La URL sigue siendo el redirect: es la única
  que da Google y es la que pide para la atribución.
- Las filas viejas se traducen al leerlas (`analysesRepository.ts`): un dominio
  `vertexaisearch…` se descarta y la card cae al título de la fuente.
- Verificado end-to-end contra Gemini: **6 de 9 fuentes con link, 0 con dominio basura.**

### El resultado vive en una URL
`/analizando` guardaba en `sessionStorage` y navegaba a `/resultado`: recargar perdía el
análisis y el link de compartir solo funcionaba en el propio navegador. Además había dos
vistas distintas para lo mismo, y la del link compartido mostraba solo la card.

- `GET /analyses/:id` pasó a **auth opcional** (`attachUserIfPresent`): sin sesión sirve
  el análisis de un enlace público; con sesión sirve además los propios que salieron de
  una captura, que solo ve su dueño.
- `/resultado/:id` es ahora la pantalla de resultado del producto, con sidebar si hay
  sesión y encabezado público si no. La vista completa se extrajo a
  `components/result/resultado-completo.tsx`, así que **el que recibe un link compartido
  ve el razonamiento entero**, no solo el veredicto.
- `/resultado` (sessionStorage) quedó solo para lo que no tiene id: análisis fallidos y
  el caso raro de un análisis que no se pudo guardar (que ahora lo avisa).
- El historial y los "recientes" del sidebar son enlaces de verdad (`<a href>`), así que
  se abren en otra pestaña y el navegador los marca como visitados.

### Tests (no había ninguno)
**69 tests** con Vitest: 57 en `backend/` (`npm test`) y 12 en `apps/`. Cubren lo que no
se puede verificar a ojo: la tabla veredicto × confianza en las dos puntas,
`parseGeminiResponse` (con fixtures que replican la forma real de los groundingChunks),
la defensa de SSRF, y la limpieza de texto/URLs.

**El test de SSRF encontró un agujero real al escribirlo:** `http://[::ffff:127.0.0.1]/`
pasaba como pública. La API de URL normaliza esa dirección a `::ffff:7f00:1` en
hexadecimal y el chequeo de IPv4 mapeada solo entendía la forma con puntos. Corregido en
`validateUrl.ts`.

### Logging estructurado
`backend/src/utils/logger.ts`: una línea de JSON por evento, con las claves que espera
Cloud Logging (`severity`/`message`). Instrumentado en `/analyze` y `/analyze/content`
con latencia, veredicto, método de scrape, si fue cache hit y **cuántas fuentes quedaron
con link** — la métrica que habría hecho visible el bug de grounding. El contenido que la
persona analiza nunca entra al log, igual que promete la política de privacidad.

### Limpieza
- Borrados: `apps/entrypoints/popup/` y `apps/wxt.config.ts` (la extensión vieja, muerta
  desde que vive en `apps/extension/`), `apps/extension/.../pageExtractor.ts` (definido y
  nunca importado), `apps/lib/Descargas - Acceso directo.lnk`, `backend/captura.png`,
  `backend/test-*.ps1`, `backend/test-parse.ts`.
- `backend/dist/` salió del repositorio (estaban commiteados 30 `.js` compilados que se
  desincronizaban del `.ts`). Se regenera con `npm run build`.
- Nuevos `.env.example` en `apps/`, `apps/extension/` y `backend/`: antes no había forma
  de saber qué variables hacen falta para levantar el proyecto.
- En el home, la sección de la extensión va antes del quiz: lo que diferencia al producto
  antes de lo que entretiene.

### Lo que NO se tocó, a propósito
- ~~9 errores de `react-hooks/set-state-in-effect`~~ **Resuelto.** Verificado el
  26-oct-2026: `npm run lint` en `apps/` pasa limpio.
- **Rate limiter en memoria.** Está documentado en `rateLimiter.ts`. En Cloud Run con
  autoescalado, el límite de 20/hora se multiplica por instancia. Al deployar: o
  `max-instances=1`, o mover el conteo a Postgres (no hace falta Redis).

---

## 14. App móvil (26-oct-2026)

Arrancó de cero en `mobile/`, **fuera de `apps/`** a propósito: adentro, Metro y Next se
pelean por el mismo `node_modules` y el mismo `tsconfig`.

### Stack
Expo **SDK 58** (salió el 15-oct-2026) con React Native 0.88, Expo Router 58, React 19.3,
React Compiler activado y la New Architecture por default. Firebase 13.

**Se abre con Expo Go**, escaneando el QR de `npx.cmd expo start`. No hace falta compilar
nada.

Esto costó medio día de rodeo y vale la pena dejarlo escrito: el changelog de SDK 58 decía
que el Expo Go de esa versión llegaría "en unas semanas", y sobre esa frase se armó todo un
camino de *development build* con EAS — cuenta de Expo, keystore, y una subida de 814 MB
que la conexión del colegio cortaba con `ECONNRESET` una y otra vez. El Expo Go de SDK 58
**ya estaba publicado**. La lección: antes de dar Expo Go por imposible, correr
`expo start` y mirar si dice "Using Expo Go". Si dice "Using development build" es porque
está instalado `expo-dev-client`, que fuerza ese modo.

De paso quedó comprobado que bajar a 57 y volver a 58 **no requiere ni un cambio de
código**: solo versiones de dependencias, y el typecheck pasa limpio en las dos.

### Qué comparte con el resto del producto
Mismo backend y mismo proyecto de Firebase: la cuenta de la web entra en la app y los
análisis caen en el mismo historial. `src/lib/verdict.ts` y `src/lib/api.ts` son espejos de
los de `apps/lib/`, y `src/theme/tokens.ts` es el Design System V1 traducido (paleta cruda +
roles semánticos, misma estructura de dos capas que `global.css`).

### Pantallas
Login/registro, Verificar (enlace, texto o **captura de la galería**, con los números de la
plataforma a la vista), el **recorte** de la captura, la revisión de la transcripción, la
espera, el resultado completo (veredicto, confianza, razonamiento, fuentes, tono) con
compartir y borrar, historial, y **Configuración** como menú en lista: cuenta, apariencia,
idioma, legales, Boreal Data y, al final y en tono bajo, el borrado de datos.

### Lo que se aprendió haciéndola (27-oct-2026)
- **El recorte va antes de achicar la imagen**, no después: recortar sobre una versión ya
  reducida pierde el detalle justo en el texto chico del posteo.
- **`overflow: hidden` corta las áreas táctiles** que sobresalen del contenedor. Las
  agarraderas del marco de recorte eran imposibles de agarrar por eso; se resolvió
  separando el marco en dos capas, una que recorta y otra que no.
- **Animaciones cíclicas: seno, nunca módulo.** `valor % 1` salta de 0,99 a 0 en un frame.
  Y `withRepeat(..., reverse)` vuelve al valor inicial de la repetición, así que si cada
  capa arranca en su propio desfase, termina oscilando en un tramo recortado.
- **PHPicker de iOS falla con fotos de iCloud** no descargadas
  (`Cannot load representation of type public.png`). Se arregla pidiendo
  `preferredAssetRepresentationMode: Compatible`.
- **Renombrar un archivo de ruta deja el árbol de Expo Router cacheado.** Hay que reiniciar
  Metro con `--clear` o la pantalla abre en blanco.

### Idioma (26-oct-2026)
La app está en castellano e inglés, con el mismo patrón que la web: `src/lib/idioma.ts` es
espejo de `apps/lib/idioma.ts` y los textos viven al lado de cada pantalla en un
`traducciones({ es, en })`, donde TypeScript obliga a que el inglés tenga la misma forma
que el castellano. Única diferencia: la preferencia va a AsyncStorage y no a una cookie,
porque acá no hay servidor que renderice. El idioma activo viaja al backend en cada
análisis, así que Gemini escribe el veredicto directamente en ese idioma.

### Decisiones y trampas
- **`localhost` en el teléfono es el teléfono.** `src/lib/config.ts` deduce la IP del
  backend del host de Metro (`Constants.expoConfig.hostUri`), así no hay que escribir la IP
  de la LAN en un `.env` cada vez que cambia el WiFi. Perfil muestra la URL en uso.
- **La sesión no persiste con `getAuth()` en React Native:** hay que pedir
  `initializeAuth` + `getReactNativePersistence(AsyncStorage)`.
- **`firebase/auth` no declara `getReactNativePersistence` en sus typings** (los tipos
  publicados son los del build de browser, el símbolo solo existe en el de RN): la firma
  está escrita a mano en `src/lib/firebase.ts`.
- **StyleSheet y no NativeWind:** la web usa Tailwind v4 y el soporte de NativeWind para v4
  todavía no está cerrado. Los tokens tipados dan el mismo contrato sin esa apuesta.
- **Los iconos se generan desde el isotipo "Umbral"** con sharp (el que ya está en
  `apps/node_modules`), no se dibujan a mano.
- `apiFetch` tiene timeout, a diferencia del de la web: en celular la red se corta y un
  fetch colgado deja la pantalla de "analizando" girando para siempre.

---

*Documento generado como contexto de continuidad del Proyecto FAT 2026 — Boreal Data.*
