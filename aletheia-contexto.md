# Contexto del Proyecto — aletheIA
> Archivo de referencia para retomar el proyecto sin perder contexto.
 
---
 
## El Proyecto
 
**Nombre:** aletheIA
**Empresa:** Boreal Data
**Descripción:** Sistema multiplataforma de detección de fake news. El usuario ingresa una URL o activa la extensión en el navegador, y el sistema devuelve un porcentaje de veracidad (0–100%) con etiqueta y explicación.
 
**Integrantes:**
- **Ciro Di Marsico** — Backend Lead / Scrum Master (API, scraping, IA, BD, infra GCP)
- **Renzo Lanata** — Frontend Lead (web, extensión Chrome, diseño)
**Repo local (máquina de Ciro, Windows):** `C:\Users\cirod\BorealData` (carpeta conectable vía device bridge en Cowork).
 
---
 
## Stack Tecnológico Definitivo
 
```
FRONT-END
  Web        → Next.js (TypeScript)
  Mobile     → Expo (última prioridad, solo .apk si da el tiempo)
  Extensión  → Manifest V3 + React
 
HOSTING
  Firebase Hosting (deploy web + CDN global)
 
BACK-END
  Cloud Run → Node.js + Express (TypeScript)
 
ANÁLISIS
  Scraper    → Cheerio (sitios estáticos) + Puppeteer (sitios con JS)
  Motor IA   → Gemini API (con grounding vía Google Search)
 
DATOS
  BD         → Cloud SQL (PostgreSQL)
  Auth       → Firebase Auth + JWT
 
CI/CD
  Cloud Build → git push = deploy automático
```
 
**Todo en Google Cloud Platform.** Un solo proveedor, una sola cuenta, una sola factura.
**Un solo lenguaje:** TypeScript/JavaScript de punta a punta.
 
---
 
## Prioridad de Desarrollo
 
```
1° Web (Next.js)         ← arrancar acá
2° Extensión Chrome      ← la parte más importante del proyecto
3° App móvil             ← solo si da el tiempo, sin publicar en la store
```
 
---
 
## Por qué cada tecnología
 
| Tecnología | Por qué |
|---|---|
| Next.js | SSR, routing automático, estándar de la industria para web React |
| Expo | Único lenguaje para iOS y Android, misma base React |
| Manifest V3 + React | El popup es HTML puro, React funciona igual que en web |
| Node.js + Express | Full JS/TS, más documentado que Hono, fácil de aprender |
| Cheerio + Puppeteer | Equivalentes JS de BeautifulSoup + Playwright |
| Gemini API | Free tier generoso, integrado en GCP, ya trabajan con Google |
| Cloud Run | Escala a cero, Docker, deploy desde GitHub, sin pagar por horas sin uso |
| Cloud SQL | PostgreSQL real, open source, dentro de GCP |
| Firebase Auth | Gratis, login con Google en pocas líneas, genera JWT |
| Firebase Hosting | Deploy web estático gratis con CDN global |
| Cloud Build | CI/CD nativo de GCP, deploy automático con git push |
 
**Por qué NO Firebase/Firestore para la BD:** NoSQL con limitaciones de queries complejas. Cloud SQL da PostgreSQL real con JOINs, índices y Row Level Security.
 
**Por qué Next.js y Node separados:** Puppeteer no puede correr en el entorno serverless de Next. Además la extensión también llama al backend — si la lógica estuviera en Next, la extensión dependería del frontend.
 
---
 
## Estructura del Repositorio
 
```
aletheIA/
├── apps/
│   ├── web/          → Next.js (TypeScript)
│   ├── extension/    → Manifest V3 + React
│   └── mobile/       → Expo
├── backend/          → Node.js + Express (TypeScript)
│   ├── src/
│   │   ├── index.ts        → arranque del server Express (monta analyzeRouter + historyRouter + meRouter, carga dotenv)
│   │   ├── scraper/        → módulo de scraping (Cheerio + Puppeteer)
│   │   │   ├── types.ts
│   │   │   ├── cheerioScraper.ts
│   │   │   ├── puppeteerScraper.ts
│   │   │   └── scrapeUrl.ts
│   │   ├── gemini/          → módulo de análisis con IA (Gemini + grounding)
│   │   │   ├── types.ts            → AnalysisResult, AnalysisSource, GeminiOptions, VeracityLabel, SourceStance
│   │   │   ├── geminiClient.ts     → llamada cruda a la API + parseo de JSON + cruce con groundingChunks
│   │   │   └── analyzeContent.ts   → orquestador (punto de entrada del módulo)
│   │   ├── db/               → módulo de persistencia (Postgres) — código y flujo funcionando end-to-end, confirmado con Firebase Auth real
│   │   │   ├── pool.ts               → pool de conexión perezoso, DOS modos: local (`DATABASE_URL` → Postgres en la máquina de Ciro, en uso desde 31-ago-2026) o nube (Cloud SQL Connector, para cuando se despliegue)
│   │   │   ├── analysesRepository.ts → saveAnalysis() (recibe userId opcional) + getAnalysesByUserId() (31-ago-2026, para GET /history — paginado, ordenado por created_at DESC)
│   │   │   ├── usersRepository.ts    → upsertUser() (crea/actualiza `users` a partir del uid de Firebase; `fullName` opcional, 31-ago-2026) + getUserProfile() (31-ago-2026, para GET /me)
│   │   │   └── schema.sql            → DDL de `analyses` + `users` + FK analyses.user_id → users.id — corrida contra el Postgres local, confirmada funcionando
│   │   ├── auth/              → módulo de autenticación (Firebase Auth) — ✅ activado y confirmado funcionando end-to-end (31-ago-2026)
│   │   │   ├── types.ts             → tipo AuthenticatedUser + declare global Express.Request.user
│   │   │   ├── firebaseAdmin.ts     → init perezoso de Firebase Admin (applicationDefault + projectId explícito)
│   │   │   └── verifyAuth.ts        → attachUserIfPresent (auth opcional) y requireAuth (auth obligatoria)
│   │   └── routes/
│   │       ├── analyze.ts   → POST /analyze (auth opcional + scraper + Gemini + guardado en BD, combinados) — probado sin token y con token real de Firebase
│   │       ├── history.ts   → GET /history (auth obligatoria vía requireAuth) — implementado y confirmado funcionando end-to-end (31-ago-2026), paginado (?limit/?offset)
│   │       └── me.ts        → GET /me + POST /me (auth obligatoria vía requireAuth) — implementado 31-ago-2026, para guardar/leer el nombre completo (`full_name`) del usuario, pendiente de probar end-to-end
│   ├── claude.md      → guía para Claude Code sobre este subdirectorio (reglas de git, comandos, arquitectura)
│   ├── package.json
│   └── tsconfig.json
├── docs/             → documentacion-inicial.md
├── design/           → wireframes y mockups
├── assets/           → imágenes y logos
└── README.md
```
 
> Nota: `routes/scrapeTest.ts` (la ruta de prueba `POST /scrape-test`) fue **eliminada**. Se reemplazó directamente por `routes/analyze.ts`.
 
## MVP — Funciones Definidas
 
**Frontend Web**
- Ingresar URL y recibir análisis
- Ver score, etiqueta y explicación
- Login con Google
- Historial de análisis
- Ver detalle de análisis anterior
**Extensión Chrome**
- Analizar página activa sin copiar link
- Ver resultado en el popup
**Backend**
- `POST /analyze` con scraping + Gemini + guardado en BD ✅ **funcionando end-to-end**
- `POST /analyze`: middleware de verificación de ID token de Firebase (`attachUserIfPresent`) ✅ **activado y confirmado funcionando end-to-end (31-ago-2026)** — auth **opcional** (el análisis sigue funcionando sin login, `user_id` queda `NULL`; con token válido de Firebase, queda asociado al usuario). Probado con `/analyze` sin token y con un token real conseguido vía la REST API de Identity Toolkit (`signUp`/`signInWithPassword`), sin necesitar frontend todavía.
- `GET /history` — ✅ **implementado y confirmado funcionando end-to-end (31-ago-2026)** en `backend/src/routes/history.ts`. Usa `requireAuth` (login obligatorio, responde 401 sin token válido), resuelve el id interno del usuario con `upsertUser()` (mismo patrón que `/analyze`) y trae sus análisis con la nueva `getAnalysesByUserId()` (`db/analysesRepository.ts`), más recientes primero, paginado con `?limit` (default 20, máx 100) y `?offset` (default 0). A diferencia de `/analyze`, acá un fallo de DB sí devuelve 500 (no hay fallback: es la única fuente del dato). Probado con un token real de Firebase (usuario `test@aletheia.com`, creado vía REST API de Identity Toolkit): sin token → 401; con token y sin análisis previos → `{ analyses: [] }`; tras un `POST /analyze` con ese mismo token → el análisis aparece correctamente en `GET /history` con todos los campos completos (`summary`, `sources`, etc.), confirmando que filtra por el usuario correcto. Paginación (`?limit`/`?offset`) también confirmada. Ver script `backend/test-history.ps1`.
- `GET /me` / `POST /me` — implementados (31-ago-2026) en `backend/src/routes/me.ts`, ambos con `requireAuth`. `GET /me` devuelve el perfil guardado (`id`, `email`, `fullName`, `createdAt`); `POST /me` con body `{ fullName }` lo guarda/actualiza. Pensado para que el frontend lo llame justo después del registro (email/contraseña, con lo que tipeó el usuario) o de un login con Google (con `user.displayName`, que Firebase completa solo). **Pendiente: probar end-to-end** (script `backend/test-me.ps1` ya armado).
- Verificación JWT obligatoria (`requireAuth`, ya implementado en `auth/verifyAuth.ts`) — en uso en `/history` y `/me`
**Base de datos**
- **Postgres local** en la máquina de Ciro (Windows, instalado 31-ago-2026) — usado para todo el desarrollo día a día, $0 de costo de GCP. La instancia de Cloud SQL en la nube (`aletheia-bd`) **se borró** para cortar el costo de tenerla prendida 24/7; se recreará solo cuando se llegue al deploy real (ver "Módulo DB").
- Tabla `analyses` — creada (schema.sql corrido contra el Postgres local) y con guardado confirmado end-to-end; columna `user_id` se completa cuando hay usuario autenticado
- Tabla `users` — creada (DDL corrido), confirmada con filas reales de usuarios de prueba (uid + email de Firebase)
---
 
## Flujo Principal
 
```
Usuario ingresa URL
       ↓
Scraper extrae el texto (Cheerio → Puppeteer si falla)
       ↓
Gemini API analiza con grounding (Google Search):
  score + etiqueta + resumen + explicación + afirmación-vs-evidencia + fuentes + toneFlags (JSON)
       ↓
Se guarda en Postgres (analyses) — funcionando end-to-end, no bloqueante si falla
       ↓
Se devuelve al frontend / extensión
```
 
---
 
## Convención de Commits
 
Conventional Commits:
```
feat(web): descripción
fix(backend): descripción
docs(readme): descripción
chore(gcp): descripción
refactor(scraper): descripción
```
 
Scopes principales: `web`, `extension`, `mobile`, `backend`, `db`, `auth`, `gcp`, `docs`, `design`
 
---
 
## Módulo Scraper — Detalle Técnico
 
**Ubicación:** `backend/src/scraper/`
 
**Lógica general:**
1. Llega una URL.
2. Se intenta scrapear con **Cheerio** (rápido, sin navegador, solo HTML crudo).
3. Se evalúa si el resultado "alcanza" con una heurística (no hay try/catch mágico, porque Cheerio nunca tira error con una SPA vacía):
   - Si el texto extraído tiene menos de `minTextLength` caracteres (default 500), O
   - Si detecta un contenedor típico de SPA vacío (`#root`, `#app`, `#__next`, `[data-reactroot]` con menos de 50 caracteres de texto)
   - → se marca `success: false` y se dispara el fallback.
4. Si Cheerio no alcanzó, se reintenta con **Puppeteer** (abre un Chrome headless, espera `networkidle2`, y le pasa el HTML final resultante a Cheerio para extraer el texto de la misma forma).
5. Devuelve siempre un objeto `ScrapedContent` con la misma forma, sin importar qué método se usó.
**Archivos:**
 
- **`types.ts`** — Define `ScrapedContent` (url, title, text, method, success, error?) y `ScraperOptions` (minTextLength, timeoutMs). Es el contrato que usan los otros 3 archivos.
- **`cheerioScraper.ts`** — Descarga el HTML con `axios` (con User-Agent de navegador real para evitar bloqueos, y `validateStatus: () => true` para manejar 4xx/5xx manualmente). Limpia el HTML sacando `script, style, noscript, iframe, svg, nav, footer, header, form, aside`. Prioriza `<article>` > `<main>` > `<body>` como contenedor de búsqueda. Extrae texto de `p, h1, h2, h3, li`.
- **`puppeteerScraper.ts`** — Mismo objetivo pero para sitios con JS. Abre Chrome headless, navega con `waitUntil: "networkidle2"` (espera a que casi no haya requests de red en curso, señal de que terminó de cargar contenido dinámico), y le pasa el HTML final a Cheerio para extraer el texto igual que el otro scraper. Siempre cierra el browser en el `finally`.
- **`scrapeUrl.ts`** — Orquestador. Es el único punto de entrada que se usa desde afuera (rutas). Prueba Cheerio primero; si `success: false`, prueba Puppeteer y devuelve ese resultado (sea cual sea).
### Bug conocido (pendiente, no bloqueante)
 
**Problema:** en sitios como Clarín, el resumen en viñetas que aparece debajo del título (ej. `<h2 class="storySummary"><ul><li>...</li></ul></h2>`) no se está extrayendo correctamente. Se probó un fix (filtrar el texto de un `h1/h2/h3` cuando tiene un `<li>` anidado adentro, para no duplicar contenido) pero **el resultado no cambió** al probarlo de nuevo contra la misma URL real.
 
**Se descartó como causa:**
- No es un bloqueo de Clarín al scraper (se confirmó con un script de debug: `axios` con User-Agent de navegador trae el HTML completo, status 200, 332KB).
- El `h2.storySummary` **sí existe** en el HTML crudo, 1 sola vez, y sobrevive al `.remove()` de `header/nav/etc` (confirmado con debug).
- No hay `<article>` ni `<main>` en el HTML de Clarín — el contenedor usado termina siendo `$("body")`.
**Decisión:** se dejó pendiente para no trabar el avance. El scraper funciona bien para el cuerpo principal del artículo (que es el 95% del contenido y lo más importante para el análisis de Gemini); el bloque de resumen en viñetas es un extra que se puede recuperar más adelante sin bloquear el resto del desarrollo.
 
---
 
## Módulo Gemini — Detalle Técnico
 
**Ubicación:** `backend/src/gemini/`
 
**Lógica general:**
1. Recibe un `ScrapedContent` (viene de `scrapeUrl()`).
2. `analyzeContent.ts` valida antes de gastar la llamada a la API: si `scraped.success` es `false`, o si el texto tiene menos de 200 caracteres, devuelve `no_verificable` sin llamar a Gemini.
3. Si pasa la validación, `geminiClient.ts` arma el prompt (título + cuerpo) y llama a la API con **grounding vía Google Search activado** (tool `googleSearch`).
4. Gemini devuelve texto libre (puede incluir razonamiento) con un bloque ` ```json ` al final. Se extrae y parsea ese bloque de forma tolerante.
5. En paralelo, se extraen los `groundingChunks` reales de la respuesta (fuentes que Google Search efectivamente devolvió) y se cruzan por similitud de título con las fuentes que Gemini describió en el JSON, para asignarles su URL real.
6. Devuelve siempre un objeto `AnalysisResult` con la misma forma: `score` (0-100), `label` (enum `VeracityLabel`), `summary`, `explanation`, `claimVsEvidence`, `sources` (array de `AnalysisSource`), `toneFlags` (array de strings), `success`, `error?`.
**Archivos:**
 
- **`types.ts`** — Define:
  - `VeracityLabel`: `verdadero | mayormente_verdadero | mixto | mayormente_falso | falso | no_verificable`.
  - `SourceStance`: `respalda | contradice | neutral_relacionada`.
  - `AnalysisSource`: `{ title, url (string | null), stance, note }` — una fuente consultada, con su postura respecto de la afirmación central del artículo.
  - `AnalysisResult`: `{ score, label, summary, explanation, claimVsEvidence, sources, toneFlags, success, error? }`.
  - `GeminiOptions` (model, maxInputChars).
- **`geminiClient.ts`** — Cliente crudo. Instancia `GoogleGenAI` de forma **perezosa** (lazy, en `getClient()`) para no romper el arranque del server si `GEMINI_API_KEY` no está seteada — recién explota cuando `/analyze` la necesita de verdad. Contiene:
  - `buildPrompt()` — arma el prompt con instrucciones de fact-checking + regla anti-knowledge-cutoff + tono/estilo + pide explícitamente `summary`, `claimVsEvidence` y `sources` (título/stance/nota, **sin URL** — la URL nunca se le pide al modelo, para no arriesgar alucinación de links).
  - `callGemini()` — llama a `ai.models.generateContent()` con `tools: [{ googleSearch: {} }]`, trunca el texto a `maxInputChars` (default 12000).
  - `extractGroundingLinks()` — lee `response.candidates[0].groundingMetadata.groundingChunks` y devuelve la lista real de `{ title, url }` que Google Search encontró.
  - `attachRealUrls()` — cruza las fuentes que describió Gemini (sin URL) con `groundingLinks` por similitud de título (substring case-insensitive); si no hay match, la fuente queda con `url: null` en vez de inventar un link. Nunca reutiliza la misma URL para dos fuentes distintas.
  - `extractJsonBlock()` — extrae el JSON de la respuesta de texto (busca bloque ` ```json `, si no encuentra cae al primer `{` hasta el último `}`).
  - `parseGeminiResponse()` — parsea y valida el JSON contra el contrato (clampea `score` a 0-100, valida `label`/`stance` contra sus enums, arma `sources` vía `attachRealUrls`). Recibe `groundingLinks` como parámetro opcional para poder testearla con fixtures fijos sin pegarle a la API real.
  - `errorResult()` — helper interno que arma un `AnalysisResult` de error con todos los campos del contrato completos (evita tener que repetir la forma completa del objeto en cada `return` de error).
- **`analyzeContent.ts`** — Orquestador. Punto de entrada único del módulo (igual patrón que `scrapeUrl.ts` en el scraper). Valida `scraped.success` y longitud mínima del texto (200 chars) antes de llamar a `callGemini()`.
### 📋 Campos nuevos del contrato: transparencia del veredicto (ago-2026)
 
A pedido de Ciro, se extendió `AnalysisResult` para que el usuario final pueda ver **en qué se basó** el veredicto, no solo el score:
 
- **`summary`** — resumen corto (2-3 oraciones) de la noticia en sí, no del veredicto. Objetivo: que el usuario sienta que la IA leyó el contenido real, no que tiró un número al azar.
- **`claimVsEvidence`** — comparación explícita entre lo que afirma el artículo y lo que muestra la evidencia encontrada.
- **`sources`** — array de `AnalysisSource`. Cada fuente indica si **respalda**, **contradice**, o es solo **neutral_relacionada** respecto de la afirmación central. Si el veredicto no requirió búsqueda externa (contradicción interna obvia, tema trivial/autoevidente), igual se genera una entrada con `url: null` explicando que el análisis fue sobre el propio texto — la idea es que el front **siempre** tenga algo que mostrar en esa sección, nunca un array vacío sin explicación.
**Por qué la URL de cada fuente no la escribe Gemini directamente:** cuando se usa la tool `googleSearch`, las fuentes reales que devuelve la búsqueda vienen en `groundingMetadata.groundingChunks` de la respuesta de la API — **no** en el texto libre que genera el modelo. Si se le pidiera a Gemini que escriba las URLs a mano en el JSON, hay riesgo de alucinación de links (URLs que parecen reales pero no existen). Por eso el prompt le pide a Gemini solo `title`/`stance`/`note` por fuente, y el backend cruza eso con los `groundingChunks` reales (`attachRealUrls()`) para completar la URL. Si no hay match de título, la fuente queda con `url: null` en vez de asignarle un link inventado o incorrecto.
 
**Nota técnica confirmada:** si se combinara `googleSearch` con salida estructurada (`responseMimeType`/`response_json_schema`), los `groundingChunks`/`groundingSupports` de la respuesta vienen **vacíos** aunque sí se hayan hecho búsquedas (confirmado en foro oficial de Google AI Developers). Esto refuerza la decisión de no usar `responseMimeType` mientras haya grounding activo — se perdería la fuente real de las URLs.
 
### ⚠️ Decisión de diseño importante: `responseMimeType` vs `tools`
 
La API de Gemini **no permite combinar** `responseMimeType: "application/json"` con `tools` (function calling / grounding) — tira error 400 `INVALID_ARGUMENT`. Además, aunque se pudiera combinar, los `groundingChunks` vendrían vacíos (ver nota arriba). Por eso:
- **No se usa** `responseMimeType`.
- El formato JSON se pide **por instrucciones en el prompt** (bloque ` ```json `).
- El parseo (`extractJsonBlock` + `parseGeminiResponse`) es tolerante a texto/razonamiento alrededor del bloque JSON.
Si en algún momento se saca el grounding, se podría volver a usar `responseMimeType` para un parseo más estricto — pero perdería la corrección de knowledge cutoff y las URLs reales de fuentes, así que no se recomienda sacarlo.
 
### 🐛 Bug encontrado y resuelto: knowledge cutoff en el análisis de veracidad
 
**Problema detectado:** en la primera versión (sin grounding), se probó `/analyze` con una noticia real de BBC ("Muere Jorge Messi, padre de Lionel Messi", agosto 2026) y Gemini la calificó como **`falso` con score 5**, con una explicación que decía literalmente que "Jorge Messi se encuentra vivo" — un dato desactualizado del conocimiento de entrenamiento del modelo.
 
**Causa raíz:** el modelo, al no tener acceso a información posterior a su fecha de corte de entrenamiento, interpretaba cualquier hecho reciente que contradijera "lo último que sabía" como una prueba de falsedad — exactamente el peor lugar posible para fallar, porque las noticias de último momento son el caso de uso más importante de un sistema de detección de fake news.
 
**Solución aplicada (dos frentes, ambos activos):**
1. **Grounding con Google Search** — se agregó `tools: [{ googleSearch: {} }]` a la llamada, para que Gemini pueda buscar información actual antes de emitir el veredicto, en vez de confiar solo en su conocimiento interno.
2. **Prompt reforzado** — se agregó una sección explícita ("REGLA CRÍTICA SOBRE FECHAS Y HECHOS RECIENTES") que instruye al modelo a **nunca** calificar algo como falso solo por contradecir su conocimiento previo, y a usar la búsqueda web antes de penalizar.
**Verificación:** se volvió a probar la misma URL de BBC después del fix y el resultado se corrigió correctamente (confirmado por Ciro). Luego se re-confirmó una segunda vez tras agregar los campos `summary`/`claimVsEvidence`/`sources` (confirmado por Ciro: "ya funciona"). **Re-confirmado una tercera vez el 24-ago-2026, ya con el guardado real en Cloud SQL**: la misma URL de BBC volvió a dar score 100 / `verdadero`, y la fila quedó persistida correctamente.
 
**Trade-off aceptado:** el grounding aumenta la latencia (Gemini puede hacer una o más búsquedas antes de responder) y tiene un esquema de pricing propio en la API, aparte del costo por tokens. No se optimizó esto todavía — queda como posible ítem futuro si el costo/latencia se vuelve un problema real.
 
---
 
## Ruta `/analyze` — Detalle Técnico
 
**Ubicación:** `backend/src/routes/analyze.ts`
 
`POST /analyze` con body `{ "url": "..." }`. Flujo: `scrapeUrl()` → `analyzeContent()` → `saveAnalysis()` (best-effort, no rompe la respuesta si falla) → responde JSON combinado.
 
**Respuestas:**
- **200** — `{ url, title, scrapeMethod, score, label, summary, explanation, claimVsEvidence, sources, toneFlags }`
- **400** — falta el campo `url` en el body
- **422** — el scraper no pudo extraer contenido de la URL (incluye el objeto `scraped` completo para debug)
- **502** — el scraping funcionó pero el análisis con Gemini falló (incluye `detail` con el mensaje de error puntual, y metadata del scraping)
- **500** — error inesperado no controlado
**Ejemplo de respuesta 200 (forma actual):**
```json
{
  "url": "https://...",
  "title": "...",
  "scrapeMethod": "cheerio",
  "score": 5,
  "label": "falso",
  "summary": "El artículo reporta que...",
  "explanation": "El score bajo se debe a que...",
  "claimVsEvidence": "El artículo afirma que X, pero la evidencia encontrada muestra que Y...",
  "sources": [
    {
      "title": "BBC News Mundo",
      "url": "https://www.bbc.com/mundo/...",
      "stance": "contradice",
      "note": "Confirma que el hecho reportado no ocurrió según fuentes oficiales."
    },
    {
      "title": "Análisis del texto",
      "url": null,
      "stance": "contradice",
      "note": "El artículo se contradice a sí mismo al citar dos fechas distintas para el mismo evento."
    }
  ],
  "toneFlags": []
}
```
 
**Reemplaza** a la vieja ruta de prueba `POST /scrape-test`, que fue borrada. El guardado en Postgres y la verificación de Firebase Auth ya están **wireados y probados end-to-end** (31-ago-2026, sin token y con token real). Ver secciones "Módulo DB" y "Módulo Auth (Firebase)" para el detalle técnico.
 
### Testing manual — casos de prueba armados
 
Se armaron 3 HTML de prueba (servidos localmente con `npx serve .`) para validar el comportamiento del módulo Gemini sin depender de sitios externos:
- **`falso-obvio.html`** — afirmación científica imposible ("el agua del Río de la Plata fluye hacia arriba"). Resultado esperado y obtenido: score 0, `falso`.
- **`mixto-sensacionalista.html`** — tema real (cafeína y corazón) con título/tono clickbait pero cuerpo con matices correctos. Resultado esperado y obtenido: score 85, `mayormente_verdadero`, con `toneFlags` pobladas (sensacionalismo detectado como señal separada del score de veracidad — el comportamiento fino que se buscaba).
- **`verdadero-control.html`** — dato astronómico neutral y verificable (período orbital de la Tierra). Resultado esperado y obtenido: score 100, `verdadero`, `toneFlags` vacío (control negativo, confirma que el sistema no tira "sospechoso" por defecto).
Los 3 casos dieron el resultado esperado. Estos archivos son reutilizables para regresión manual si se vuelve a tocar el prompt o el modelo. **Pendiente:** volver a correr estos 3 casos con el contrato nuevo (summary/claimVsEvidence/sources) para confirmar que el cruce de `groundingChunks` funciona bien también en esos escenarios (especialmente en `falso-obvio`, donde es esperable que la fuente relevante tenga `url: null` por tratarse de una ausencia de evidencia más que una fuente puntual que lo desmienta).
 
**Nota sobre `.env` en Windows:** `tsx` no carga `.env` automáticamente. Se resolvió agregando `import "dotenv/config"` como primera línea de `src/index.ts` (paquete `dotenv` ya instalado). Si `GEMINI_API_KEY` no llega a `process.env`, `/analyze` responde 502 con el detalle `"GEMINI_API_KEY no está definida en las variables de entorno."`.
 
---
 
## Ruta `/history` — Detalle Técnico

**Ubicación:** `backend/src/routes/history.ts`

**Estado (31-ago-2026): ✅ implementada y confirmada funcionando end-to-end.**

`GET /history` con header **obligatorio** `Authorization: Bearer <Firebase ID token>` (usa `requireAuth`, a diferencia de `/analyze` que usa `attachUserIfPresent` porque ahí el login es opcional). Query params opcionales para paginar: `?limit` (default 20, clampeado a un máximo de 100) y `?offset` (default 0).

**Flujo:** `requireAuth` valida el token y corta con 401 si falta o es inválido/expiró → `upsertUser(req.user.uid, req.user.email)` resuelve el id interno del usuario (mismo patrón que `/analyze`, cubre el caso de que sea la primera vez que ese uid pega contra el backend) → `getAnalysesByUserId(userId, limit, offset)` (nueva función en `db/analysesRepository.ts`) trae sus análisis ordenados por `created_at DESC`.

**Respuestas:**
- **200** — `{ analyses: AnalysisHistoryItem[], limit, offset }`, donde cada item tiene la misma forma que la respuesta 200 de `/analyze` más `id` y `createdAt`.
- **401** — falta el header `Authorization` o el token es inválido/expiró (respondido por `requireAuth`).
- **500** — no se pudo resolver el usuario en la DB, o la query de historial falló. A diferencia de `saveAnalysis()` (que es best-effort y nunca rompe `/analyze`), acá un fallo de DB sí se propaga como error: `/history` no tiene otra fuente de datos.

### ✅ Cómo se probó (31-ago-2026)

Se armó `backend/test-history.ps1`, un script de PowerShell que automatiza todo el flujo usando la misma técnica de la REST API de Identity Toolkit que se usó para probar `/analyze` (ver "Módulo Auth (Firebase)" → "Cómo se probó"), sin depender del frontend:

1. Consigue un token real (`signInWithPassword`, con fallback automático a `signUp` si el usuario todavía no existe) para `test@aletheia.com`.
2. `GET /history` sin token → confirmado **401**.
3. `GET /history` con token, usuario sin análisis previos → confirmado **200** con `{ analyses: [] }`.
4. `GET /history?limit=1&offset=0` → confirmado que pagina bien.
5. `POST /analyze` con ese mismo token contra una URL real (`es.wikipedia.org/wiki/Argentina`) → análisis generado y guardado (score 90, `mayormente_verdadero`).
6. `GET /history` de nuevo → el análisis recién creado aparece correctamente asociado a ese usuario, con todos los campos completos (`summary`, `explanation`, `claimVsEvidence`, `sources`, `toneFlags`, `createdAt`).

**Nota de troubleshooting real que apareció durante esta prueba:** la Web API Key de Firebase (necesaria para pegarle directo a la REST API de Identity Toolkit) **no aparece** en Configuración del proyecto → General mientras el proyecto no tenga ninguna app registrada ("No hay apps en tu proyecto"). Se resolvió registrando una Web app desde ahí (ícono `</>`, sin necesidad de tildar Hosting) — Firebase mostró el snippet `firebaseConfig` con el `apiKey` real (formato `AIzaSy...`, ~39 caracteres). Ojo con confundirla con la **VAPID key** de Cloud Messoging (Configuración del proyecto → Cloud Messaging → Web Push certificates), que tiene un formato distinto (~88 caracteres) y no sirve para este uso — es un error fácil de cometer y ya pasó una vez acá. Esta app Web recién registrada también sirve como base para cuando arranque el frontend Next.js (mismo `firebaseConfig` que va a necesitar el SDK de Firebase Auth del lado del cliente).

---

## Ruta `/me` — Detalle Técnico

**Ubicación:** `backend/src/routes/me.ts`

**Estado (31-ago-2026): implementada, pendiente de probar end-to-end** (script `backend/test-me.ps1` ya armado, mismo estilo que `test-history.ps1`).

**Motivo:** a pedido de Ciro, se agregó nombre y apellido a los usuarios — **se decidió un solo campo `full_name`** (nombre y apellido juntos) en vez de columnas separadas, para simplificar tanto el schema como la lógica de registro/login con distintos proveedores.

**Endpoints (ambos con `requireAuth`, login obligatorio):**

- **`GET /me`** — devuelve el perfil del usuario autenticado: `{ id, firebaseUid, email, fullName, createdAt }`. Llama a `upsertUser()` primero (sin `fullName`) por si es la primera vez que ese uid pega contra el backend, así la fila siempre existe antes de leerla — mismo patrón que `/analyze`/`/history`.
- **`POST /me`** — body `{ "fullName": "Ciro Di Marsico" }`. Guarda/actualiza el nombre. Devuelve 400 si falta o viene vacío.

**Por qué `fullName` es opcional en `upsertUser()`:** `/analyze` y `/history` llaman a `upsertUser(uid, email)` en cada request autenticado para resolver el id interno, pero no conocen el nombre del usuario — solo `POST /me` lo pasa. El `UPDATE` usa `full_name = COALESCE(EXCLUDED.full_name, users.full_name)`, así que una llamada sin `fullName` (desde `/analyze`/`/history`) nunca borra el nombre ya guardado; solo se actualiza cuando alguien llama explícitamente a `POST /me` con un valor.

**Cómo se integra con el frontend (para cuando se arme el login en Next.js):**

- **Email/contraseña (registro):** el formulario pide nombre y apellido → `createUserWithEmailAndPassword()` → (opcional pero recomendable) `updateProfile(user, { displayName: fullName })` para que también quede en el perfil de Firebase Auth (se ve en la consola, y queda disponible al toque como `auth.currentUser.displayName` sin esperar una respuesta del backend) → `POST /me` con `{ fullName }` — este último paso es el que realmente persiste el dato, es la fuente de verdad.
- **Google:** Firebase completa `user.displayName` automáticamente al hacer `signInWithPopup`/`signInWithRedirect` con `GoogleAuthProvider` — no hace falta pedirle nada al usuario ni tocar nada en la consola de Firebase (Google ya está activado como proveedor). Directo: `POST /me` con `{ fullName: user.displayName }`.
- En los dos casos, `POST /me` es el mismo endpoint y es el punto único donde el nombre queda en Postgres — `updateProfile()` es puramente cosmético/opcional del lado de Firebase, el sistema funciona igual sin llamarlo.
- **No hace falta tocar nada en la consola de Firebase** para esto — es todo código de cliente (SDK) + el backend ya armado.

**Migración de schema:** se agregó `full_name text` (nullable) a la tabla `users`. Si la base ya existía (como el Postgres local de Ciro), hace falta correr una vez:
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name text;
```
(Ya está agregado a `db/schema.sql`, al final, con `IF NOT EXISTS` — seguro de re-correr.)

---
 
## Módulo DB — Detalle Técnico

**Ubicación:** `backend/src/db/`

**Estado (31-ago-2026): completo y funcionando end-to-end contra Postgres local.** El desarrollo día a día corre 100% contra un Postgres instalado en la máquina de Ciro (Windows) — cero costo de GCP. La instancia de Cloud SQL en la nube (`aletheia-bd`) que se había creado el 24-ago **se borró** el 26/27-ago para cortar el gasto de tenerla prendida 24/7 (ver "Por qué se pivotó a Postgres local" más abajo). El código soporta los dos modos (local y Cloud SQL) sin cambios — se elige solo, según lo que haya en el `.env`.

**Archivos:**

- **`schema.sql`** — DDL de `analyses` + `users` + el FK `analyses.user_id → users.id`. `id` de `analyses` es uuid (`gen_random_uuid()`), `sources`/`tone_flags` son jsonb. Índice `analyses_created_at_idx` sobre `created_at DESC`. Se corre a mano (no hay herramienta de migraciones) — hoy corrido contra el Postgres local vía pgAdmin (Query Tool), antes se corría vía Cloud SQL Studio.
- **`pool.ts`** — `getPool()`: pool perezoso, mismo patrón que `getClient()` en `geminiClient.ts`. **Dos modos**, elegidos automáticamente:
  - **Modo local** (el que se usa ahora): si existe `DATABASE_URL` en el `.env`, conecta directo con `pg.Pool({ connectionString })` — sin Cloud SQL Connector, sin ADC, sin nada de GCP de por medio.
  - **Modo nube** (para cuando se despliegue): si NO hay `DATABASE_URL`, usa `@google-cloud/cloud-sql-connector` + ADC como antes (`INSTANCE_CONNECTION_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`).
- **`analysesRepository.ts`** — `saveAnalysis(scraped, analysis, userId)`: `INSERT` con los 11 campos del contrato (incluye `user_id`). **No propaga errores**: si la DB falla, loguea y devuelve `false`, para que un problema de persistencia nunca tumbe la respuesta 200 de `/analyze`. `getAnalysesByUserId(userId, limit, offset)` (31-ago-2026, nueva): `SELECT` paginado de `analyses` filtrado por `user_id`, ordenado por `created_at DESC`, usado por `GET /history`. A diferencia de `saveAnalysis`, **sí propaga errores** (no hay try/catch interno) — es responsabilidad de `routes/history.ts` atajarlos y devolver el 500, porque acá no hay un fallback razonable.
- **`usersRepository.ts`** — `upsertUser(firebaseUid, email)`: `INSERT ... ON CONFLICT (firebase_uid) DO UPDATE`, devuelve el `id` interno (uuid) que se usa como `analyses.user_id`. Ver detalle completo en "Módulo Auth (Firebase)". También lo usa `routes/history.ts` para resolver el `user_id` antes de leer.

**Dependencias instaladas:** `@google-cloud/cloud-sql-connector` (^1.11.3, ya sin uso activo pero se deja para cuando se vuelva a modo nube), `pg` (^8.23.0), `@types/pg` (^8.23.1, dev).

### 🔀 Por qué se pivotó de Cloud SQL a Postgres local (26/27-ago-2026)

Ciro notó un cargo de $0.43 en la facturación de GCP por solo 2 días de la instancia `aletheia-bd` prendida — Cloud SQL cobra por cómputo mientras la máquina está corriendo, haya o no tráfico (~$0.20-0.30/día para `db-f1-micro`, ~$8-9/mes). Se evaluaron tres opciones:

1. **Apagar la instancia cuando no se usa** — corta el cómputo pero no el storage (sigue facturando centavos), y depende de acordarse de apagarla cada vez (fricción manual, ya se había olvidado una vez).
2. **Migrar a Firestore (NoSQL)** — se descartó. Aunque resolvería el problema de costo (Firestore es serverless, sin cargo por estar "prendido", con tier gratis permanente), **no es el mejor fit técnico para este proyecto**: un detector de fake news es el tipo de producto que naturalmente crece hacia analítica (¿qué dominios se marcan más como falsos?, tendencias por semana, dashboards de admin) — eso son `GROUP BY`/agregaciones que Postgres hace con una query y Firestore no soporta nativamente. También pierde búsqueda de texto nativa (`ILIKE`/full-text) e integridad referencial (`FOREIGN KEY`). Esta razón ya estaba anotada desde el inicio del proyecto (ver "Por qué NO Firebase/Firestore para la BD" al principio de este documento) y se ratificó en esta conversación.
3. **Postgres local para desarrollo, Cloud SQL solo para el server real** ← **la que se adoptó**. Mismo motor (Postgres), mismo `schema.sql`, cero cambios de arquitectura — solo `pool.ts` aprendió a conectarse a `localhost` cuando corresponde. Durante todo el desarrollo diario no se gasta un centavo de GCP; Cloud SQL se recrea solo cuando haga falta un server real (deploy a Cloud Run, demo).

**La instancia `aletheia-bd` fue borrada** de la consola de GCP (había que desactivar primero "Protección contra eliminación" en Editar → Configuración, porque viene activada por defecto). Firebase Auth **no se vio afectado** — es un servicio completamente independiente de Cloud SQL.

### 💻 Postgres local — cómo quedó instalado en la máquina de Ciro

- Instalador nativo de Windows desde [postgresql.org/download/windows](https://www.postgresql.org/download/windows) (no Docker) — incluye **PostgreSQL Server**, **pgAdmin 4** (GUI de administración) y **Command Line Tools**.
- El instalador registra Postgres como **servicio de Windows** (`postgresql-x64-XX`) con inicio automático — corre en segundo plano todo el tiempo, no depende de tener pgAdmin abierto (a diferencia de XAMPP, donde hay que iniciar MySQL a mano cada vez). Se puede pasar a inicio **manual** desde `services.msc` (Propiedades → Tipo de inicio → Manual) si se prefiere prenderlo/apagarlo a demanda — `net start postgresql-x64-XX` / `net stop postgresql-x64-XX` desde una consola con permisos de administrador. Consumo en reposo: liviano (~20-50 MB RAM, CPU ~0).
- Base de datos creada: `aletheia` (mismo nombre que se usaba en Cloud SQL). Usuario: `postgres` (el superusuario que crea el instalador), con la contraseña elegida durante la instalación.
- `schema.sql` corrido contra esta base vía **pgAdmin → Query Tool** (pegar el contenido y ejecutar con F5) — más simple que psql por línea de comandos para alguien sin experiencia previa en Postgres.
- **Para ver los datos guardados:** pgAdmin → Servers → el servidor local → Databases → `aletheia` → Schemas → public → Tables → click derecho en `analyses` o `users` → View/Edit Data → All Rows.
- `.env`: `DATABASE_URL=postgresql://postgres:<password>@localhost:5432/aletheia`. Mientras esta variable exista, `pool.ts` la usa y **ignora** `INSTANCE_CONNECTION_NAME`/`DB_USER`/`DB_PASSWORD`/`DB_NAME` (esas quedan para cuando se vuelva a modo nube).

### ✅ Confirmado funcionando (31-ago-2026)

Probado `/analyze` contra el Postgres local: sin token (fila en `analyses` con `user_id` `NULL`) y con un token real de Firebase (fila nueva en `users` + `user_id` seteado en `analyses` apuntando a esa fila) — ver detalle del test en "Módulo Auth (Firebase)".

### 📦 Runbook de Cloud SQL — referencia para cuando se haga el deploy real

La instancia real ya no existe, pero queda documentado el paso a paso porque **hará falta recrearla cuando se despliegue a Cloud Run** (el server en producción no puede depender de un Postgres en la laptop de Ciro).

**Configuración que se usó (recrear igual, o ajustar si conviene otra región/tier):**
- **ID de instancia:** `aletheia-bd`
- **Edición:** Enterprise (⚠️ **no** la que viene por defecto — PostgreSQL 16+ preselecciona Enterprise Plus, y con esa edición no existe el tier `db-f1-micro`; hay que cambiarla a mano a Enterprise para poder elegir el tier compartido)
- **Versión:** PostgreSQL 18
- **Tipo de máquina:** `db-f1-micro` (compartido, 1 vCPU, ~629 MB RAM)
- **Almacenamiento:** 10 GB HDD
- **Región:** `us-central1`
- **Conexiones:** IP pública
- **Base de datos:** `aletheia` — **Usuario de aplicación:** `aletheia-app`
- **Costo:** ~$8-9/mes si queda prendida 24/7 — por eso la estrategia ahora es recrearla solo cuando haga falta un server real, no tenerla corriendo en paralelo al desarrollo local.

**Troubleshooting real que apareció la primera vez (24-ago-2026) — dos problemas:**

**Problema 1: `Could not load the default credentials`.** El Cloud SQL Node.js Connector no usa solo usuario/contraseña de Postgres — necesita ADC de una cuenta de Google con permiso IAM. Crear una cuenta de servicio con clave JSON está **bloqueado** por la política de organización `iam.disableServiceAccountKeyCreation` ("secure by default" en proyectos nuevos). Solución real: instalar **Google Cloud CLI**, `gcloud init`, reiniciar la terminal, `gcloud auth application-default login` (genera el ADC en `%APPDATA%\gcloud\application_default_credentials.json`). Requiere además el rol **Cloud SQL Client** (`roles/cloudsql.client`) en IAM para la cuenta usada en ese login. No hace falta `GOOGLE_APPLICATION_CREDENTIALS` por este camino.

**Problema 2: `password authentication failed for user "aletheia-app"`.** La contraseña en `DB_PASSWORD` no coincidía con la real (problema de copiar/pegar). Se resolvió reseteando la contraseña desde la consola (Instancia → Usuarios → Cambiar contraseña) y volviendo a copiarla con cuidado.

**Runbook resumido para recrear:**
1. Crear la instancia + base + usuario desde la consola (config de arriba).
2. Correr `schema.sql` en Cloud SQL Studio.
3. `gcloud` CLI ya está instalado en la máquina de Ciro → confirmar que `gcloud auth application-default login` sigue vigente (si tira error de credenciales, volver a correrlo).
4. Confirmar el rol Cloud SQL Client en IAM para esa cuenta.
5. En el `.env`: **sacar** `DATABASE_URL` (o comentarla) y completar `INSTANCE_CONNECTION_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` — `pool.ts` vuelve solo al modo nube en cuanto no encuentra `DATABASE_URL`.
6. Si falla con error de credenciales → revisar ADC/IAM. Si falla con error de password de Postgres → resetear la contraseña del usuario en la consola.

> **Nota para producción (Cloud Run):** el approach de ADC vía `gcloud auth application-default login` es solo para desarrollo local. En Cloud Run, el servicio corre con una cuenta de servicio de runtime propia (no una clave descargada) a la que hay que darle el rol Cloud SQL Client — ahí no aplica la restricción `iam.disableServiceAccountKeyCreation` porque no se descarga ninguna clave. Queda pendiente de configurar cuando se llegue al deploy.

---

## Módulo Auth (Firebase) — Detalle Técnico

**Ubicación:** `backend/src/auth/`

**Estado (31-ago-2026): ✅ confirmado funcionando end-to-end.** Firebase se agregó al proyecto de GCP existente, Authentication está activado (Google + Email/Password), `FIREBASE_PROJECT_ID` está en el `.env`, y se probó `/analyze` de las dos formas: sin token (sigue funcionando igual que siempre, `user_id` `NULL`) y con un token real de Firebase (conseguido sin frontend, vía la REST API de Identity Toolkit — ver "Cómo se probó" más abajo) — la fila queda en `users` y `analyses.user_id` apunta correctamente a ese usuario.

**Decisión de diseño: autenticación opcional en `/analyze`.** `/analyze` sigue funcionando sin login (importante para la extensión, que puede no tener sesión iniciada). Si viene un `Authorization: Bearer <token>` válido, el análisis queda asociado al usuario. Para una ruta que sí debe exigir login, el módulo ya expone `requireAuth`, que responde `401` si falta el token o es inválido — **usado ahora en `GET /history`** (31-ago-2026).

**Archivos:**

- **`types.ts`** — `AuthenticatedUser` (`{ uid, email }`) + `declare global` que extiende `Express.Request` con `user?: AuthenticatedUser`, para que `req.user` tenga tipado en cualquier route handler sin castear.
- **`firebaseAdmin.ts`** — `getFirebaseAuth()`: inicializa la app de Firebase Admin de forma **perezosa**, mismo patrón que `getClient()` (Gemini) y `getPool()` (Cloud SQL) — no rompe el arranque del server si `FIREBASE_PROJECT_ID` no está seteada, recién falla cuando se necesita verificar un token de verdad. Usa `applicationDefault()`: reutiliza las **mismas credenciales ADC** ya generadas con `gcloud auth application-default login` para el conector de Cloud SQL (no hace falta una segunda vuelta de autenticación, ni una clave de service account descargada — esa vía sigue bloqueada por la política de organización `iam.disableServiceAccountKeyCreation`, ver "Módulo DB").
- **`verifyAuth.ts`** — dos middlewares de Express:
  - `attachUserIfPresent` — si hay header `Authorization: Bearer <token>`, lo verifica con `verifyIdToken()`; si es válido adjunta `req.user`, si no lo es **loguea y sigue como anónimo** (no bloquea la request). Si no hay header, sigue derecho. Es el que usa `/analyze`.
  - `requireAuth` — mismo chequeo pero responde `401` si falta el token o es inválido/expiró. Usado en `GET /history` (31-ago-2026).

**Nota técnica importante sobre credenciales ADC + Firebase Auth:** el SDK de Firebase Admin normalmente pide credenciales de **service account**, y hay reportes de que rechaza credenciales de usuario de `gcloud` para algunas operaciones administrativas (crear tokens custom, gestionar usuarios) porque el client ID OAuth de `gcloud` no tiene los scopes de Identity Toolkit. Sin embargo, `verifyIdToken()` **sin** `checkRevoked: true` es pura verificación criptográfica del JWT contra las claves públicas de Google (`https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com`) — no hace una llamada autenticada a la API, así que no debería necesitar permisos IAM especiales, solo que `projectId` esté seteado explícitamente (por eso se pasa a mano en `initializeApp`, en vez de dejar que el SDK lo infiera del credential, que es donde falla con ADC de usuario). **Si al probarlo con un token real tira un error de credenciales**, la salida de emergencia documentada por Firebase es verificar el token a mano con una librería JWT genérica (`jsonwebtoken` + `jwks-rsa` contra esa misma URL de claves públicas) sin pasar por el Admin SDK — no necesita ninguna credencial de Google Cloud. Queda anotado acá por si hace falta ese fallback.

**No se detectan tokens revocados** (`checkRevoked` no se usa) — mismo trade-off que documenta Firebase: aceptable para el MVP, se puede agregar más adelante si hace falta invalidar sesiones activas (ej. logout global, cuenta comprometida).

### `db/usersRepository.ts` — tabla `users`

`upsertUser(firebaseUid, email)`: hace `INSERT ... ON CONFLICT (firebase_uid) DO UPDATE` y devuelve el `id` interno (uuid) de la fila. Se llama desde `routes/analyze.ts` solo cuando `req.user` existe (usuario autenticado), y desde `routes/history.ts` siempre (porque ahí el login es obligatorio) — ese `id` interno es lo que se guarda/filtra en `analyses.user_id`, **no** el uid de Firebase directamente, porque `analyses.user_id` es `uuid` y el uid de Firebase es un string arbitrario de ~28 caracteres, no un uuid. Mismo patrón "best-effort" que `saveAnalysis()`: si la DB falla, loguea y devuelve `null`, nunca tumba la respuesta de `/analyze` (en `/history`, un `null` acá se traduce en un 500 explícito, ver "Ruta /history — Detalle Técnico").

`schema.sql` ahora incluye (agregado 26-ago-2026, **todavía no corrido contra la instancia real**):
```sql
CREATE TABLE IF NOT EXISTS users (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid text NOT NULL UNIQUE,
  email        text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE analyses
  ADD CONSTRAINT analyses_user_id_fkey FOREIGN KEY (user_id) REFERENCES users (id);
```
Correrlo una vez en Cloud SQL Studio, igual que se hizo con el `CREATE TABLE analyses` original.

### ✅ Cómo se probó (31-ago-2026), sin frontend todavía

No hizo falta esperar al login web para probar el flujo completo. Se generó un token real de Firebase directo contra la REST API de Identity Toolkit, usando la **Web API Key** del proyecto (Consola de Firebase → ⚙️ Configuración del proyecto → General → "Clave de API web" — existe aunque no se haya registrado una app web todavía):

```powershell
$apiKey = "<WEB_API_KEY>"
$authBody = @{ email = "test@aletheia.com"; password = "test123456"; returnSecureToken = $true } | ConvertTo-Json
$auth = Invoke-RestMethod -Uri "https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=$apiKey" -Method Post -Body $authBody -ContentType "application/json"
$token = $auth.idToken
```

(Si el usuario de prueba ya existe, usar `:signInWithPassword` en vez de `:signUp` con el mismo body.) Con ese `$token`, se probó:

- `POST /analyze` **sin** header `Authorization` → 200 normal, fila en `analyses` con `user_id` `NULL`.
- `POST /analyze` **con** `Authorization: Bearer $token` → 200 normal, fila nueva en `users` (`firebase_uid` = el `localId` que devolvió el signUp, `email` = `test@aletheia.com`) y la fila en `analyses` con `user_id` apuntando al `id` interno de esa fila.

Los dos casos confirmados con Postgres local (ver "Módulo DB"). Esta misma técnica (REST API de Identity Toolkit) sirve para seguir probando `requireAuth` cuando se prueba `GET /history` end-to-end (pendiente), sin depender de que el frontend web tenga login todavía.

---

## Entorno y Versiones Reales del Proyecto (importante)
 
TypeScript avanzó más rápido de lo esperado — a julio 2026 las versiones reales en uso son:
- **TypeScript 7.0.2** (reescritura nativa del compilador en Go, GA desde el 8 de julio de 2026)
- **@types/node ^26.x**
- **@types/express ^5.x**
- **Express 5.x**
**Incompatibilidad conocida:** `ts-node` / `ts-node-dev` **no son compatibles con TypeScript 7** todavía (bug conocido en el ecosistema, ver issue de Cypress `cypress-io/cypress#34258` como referencia — TS 7 no expone la API de compilador tradicional que estas herramientas necesitan). Tira el error:
```
TypeError: Cannot read properties of undefined (reading 'fileExists')
```
 
**Solución aplicada:** se reemplazó `ts-node-dev` por **`tsx`**, que usa `esbuild` por debajo en lugar de la API interna de `tsc`, evitando el problema. Igual que antes (se usaba `--transpile-only`), `tsx` **no chequea tipos en desarrollo**, solo transpila — el chequeo de tipos real sigue pasando en el editor y en `npm run build` (que sí corre `tsc` completo).
 
```json
"scripts": {
  "dev": "tsx watch src/index.ts",
  "build": "tsc",
  "start": "node dist/index.js"
}
```
 
`nodemon` quedó obsoleto para este proyecto (no compila TS); se puede desinstalar con `npm uninstall nodemon`.
 
---
 
## Estado Actual del Proyecto
 
- [x] Stack tecnológico definido
- [x] README armado con CUPID, stack y estructura
- [x] Documentación inicial en /docs
- [x] Modelo CUPID definido
- [x] Encuesta de validación realizada (19 respuestas)
- [x] Matriz de Frecuencia e Impacto → Cuadrante 1 (Luz Verde)
- [x] Estructura de carpetas inicializada en GitHub
- [x] Backend inicializado con TypeScript + Express (src/index.ts, tsconfig.json)
- [x] `tsx` configurado como motor de desarrollo (reemplazo de ts-node-dev por incompatibilidad con TS 7)
- [x] Scraper funcional (Cheerio + Puppeteer con fallback automático) — probado con URL real de Clarín, extrae título y cuerpo correctamente
- [x] Módulo Gemini implementado (`backend/src/gemini/`) con grounding vía Google Search
- [x] Ruta `POST /analyze` funcionando end-to-end (scraper + Gemini combinados)
- [x] Bug de knowledge cutoff detectado y resuelto (grounding + prompt reforzado), validado con noticia real (BBC, Jorge Messi)
- [x] Casos de prueba manuales armados y validados con el contrato original (falso obvio, mixto/sensacionalista, verdadero control)
- [x] Ruta de prueba `POST /scrape-test` **eliminada**, reemplazada por `/analyze`
- [x] Contrato `AnalysisResult` extendido con `summary`, `claimVsEvidence` y `sources` (con URLs reales cruzadas desde `groundingChunks`) — implementado y confirmado funcionando por Ciro
- [x] Código de persistencia en Postgres implementado (`db/pool.ts`, `db/analysesRepository.ts`, `db/schema.sql`) y wireado en `routes/analyze.ts` (guardado best-effort tras análisis exitoso)
- [x] **Persistencia confirmada end-to-end contra Postgres local** (31-ago-2026): la instancia de Cloud SQL en la nube se borró para cortar el costo de tenerla prendida; el desarrollo corre 100% contra Postgres instalado en la máquina de Ciro (`pool.ts` soporta ambos modos, ver "Módulo DB")
- [ ] Pendiente: re-correr los 3 HTML de prueba contra el contrato nuevo para validar el cruce de fuentes en esos escenarios
- [ ] Bug menor pendiente: bloque de resumen en viñetas (`h2.storySummary` tipo Clarín) no se extrae — no bloqueante, ver sección "Bug conocido" del scraper
- [x] **Firebase Auth — activado y confirmado funcionando end-to-end** (31-ago-2026): Firebase agregado al proyecto de GCP, Authentication activado (Google + Email/Password), middleware de verificación de ID token (`auth/verifyAuth.ts`, `auth/firebaseAdmin.ts`), tabla `users` poblada, y `/analyze` probado sin token y con token real de Firebase — `user_id` queda correctamente asociado. Ver "Módulo Auth (Firebase)" para el detalle del test.
- [x] Backend: endpoint `GET /history` implementado y **confirmado funcionando end-to-end** (31-ago-2026) — `backend/src/routes/history.ts`, usa `requireAuth`, resuelve el usuario con `upsertUser` y trae los análisis con la nueva función `getAnalysesByUserId` (`db/analysesRepository.ts`), paginado con `?limit` (default 20, máx 100) y `?offset`. Probado con `backend/test-history.ps1`: 401 sin token, 200 con token (vacío al principio, y con el análisis real después de un `POST /analyze`), paginación confirmada. Se registró además una Web app en Firebase (necesaria para conseguir la Web API Key) — su `firebaseConfig` va a servir también para el frontend Next.js.
- [ ] Backend: endpoints `GET /me` / `POST /me` implementados (31-ago-2026, `backend/src/routes/me.ts`) para nombre y apellido de usuario — se decidió un solo campo `full_name` (no columnas separadas). Agregada columna `full_name` a `users` (`db/schema.sql`, migración con `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`). **Pendiente: correr la migración contra el Postgres local y probar con `backend/test-me.ps1`.**
- [ ] Frontend web: pantalla principal (ahora puede mostrar resumen + fuentes con link + afirmación vs evidencia, no solo score/label/explanation)
- [ ] Extensión Chrome: popup básico
- [ ] (Opcional, no urgente) Evaluar costo/latencia real del grounding en producción — el prompt creció con los campos nuevos, revisar si afecta tiempos de respuesta
- [ ] (Cuando se llegue al deploy en Cloud Run) Configurar la cuenta de servicio de runtime de Cloud Run con el rol Cloud SQL Client — el approach de ADC local (`gcloud auth application-default login`) no aplica en producción
---
 
## Para Retomar en el Próximo Chat
 
1. El scraper (`backend/src/scraper/`) está terminado y funcional para el MVP. No hace falta tocarlo más salvo que se quiera resolver el bug menor del resumen en viñetas.
2. El módulo Gemini (`backend/src/gemini/`) está terminado y funcional, con grounding activado para evitar el bug de knowledge cutoff, y con el contrato extendido (`summary`, `claimVsEvidence`, `sources` con URLs reales). Confirmado funcionando por Ciro. No hace falta tocarlo salvo que se quiera ajustar el prompt, cambiar de modelo, o mejorar el algoritmo de matching de `attachRealUrls()` (actualmente es substring simple case-insensitive, podría mejorarse si en la práctica falla mucho el match).
3. **El módulo DB pivotó a Postgres local** (26/27-ago-2026): la instancia de Cloud SQL se borró para cortar el costo de tenerla prendida 24/7 (se detectó un cargo de $0.43 por solo 2 días). El desarrollo ahora corre contra Postgres instalado en la máquina de Ciro; `pool.ts` soporta los dos modos (local vía `DATABASE_URL`, o nube vía Cloud SQL Connector) sin cambiar nada más del código. Se evaluó migrar a Firestore para evitar el costo, pero se descartó por el mismo motivo original (NoSQL no da agregaciones/analítica bien, y este producto probablemente las va a necesitar) — el runbook completo de Cloud SQL queda documentado para cuando se despliegue de verdad. Ver "Módulo DB" para todo el detalle.
4. **Firebase Auth: activado y confirmado funcionando end-to-end** (31-ago-2026, ver "Módulo Auth (Firebase)" para el detalle completo) — middleware `attachUserIfPresent` (auth opcional, usado en `/analyze`) y `requireAuth` (auth obligatoria, ahora usado en `/history`). Se probó sin frontend usando la REST API de Identity Toolkit para generar un token real de prueba. No hace falta tocar nada más de este módulo salvo que cambien los requisitos.
5. **`GET /history` implementado y confirmado funcionando end-to-end** (31-ago-2026, ver "Ruta /history — Detalle Técnico" y "Estructura del Repositorio") — `backend/src/routes/history.ts`, con paginación (`?limit`/`?offset`) y usando `requireAuth` + `upsertUser` + la nueva `getAnalysesByUserId()` en `db/analysesRepository.ts`. Probado con el script `backend/test-history.ps1` (401 sin token, 200 con token, y el análisis de un `POST /analyze` real apareciendo correctamente en el historial del usuario). Se registró de paso una Web app en el proyecto de Firebase (hacía falta para conseguir la Web API Key) — su `firebaseConfig` sirve también para cuando arranque el frontend Next.js.
6. **`GET /me` / `POST /me` implementados, pendientes de probar** (31-ago-2026, ver "Ruta /me — Detalle Técnico") — `backend/src/routes/me.ts`. A pedido de Ciro se agregó nombre y apellido de usuario, con la decisión de usar **un solo campo `full_name`** (más simple que columnas separadas). Se agregó la columna a `db/schema.sql` con migración segura de re-correr (`ADD COLUMN IF NOT EXISTS`) — **falta correrla contra el Postgres local** (`ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name text;` en pgAdmin) y después correr `backend/test-me.ps1` para confirmar. Ya está pensado cómo se va a integrar con el frontend cuando se arme el login: `POST /me` después del registro (email/contraseña, con lo que tipeó el usuario) o después de un login con Google (con `user.displayName`, que Firebase completa solo, sin tocar nada en la consola de Firebase). Después de confirmar esto, el siguiente paso natural es empezar el frontend web (pantalla principal) o el popup de la extensión Chrome.
7. Recordar la particularidad de versiones: **TypeScript 7 + tsx**, no usar `ts-node`/`ts-node-dev` en este proyecto.
8. `.env` se carga con `import "dotenv/config"` como primera línea de `src/index.ts` (ya resuelto, `tsx` no lo hace solo).
9. Los 3 archivos HTML de prueba (`falso-obvio.html`, `mixto-sensacionalista.html`, `verdadero-control.html`) sirven como regresión manual si se vuelve a tocar el prompt de Gemini — conviene guardarlos en el repo (por ejemplo en `backend/test-fixtures/` o similar) en vez de perderlos. Están pendientes de re-correr contra el contrato nuevo.
10. Cuando se arme el frontend, tener en cuenta que ahora hay más superficie para mostrar: `summary` (para que se sienta que la IA leyó la nota), `claimVsEvidence` (comparación directa), y `sources` (lista con link cuando existe, o nota explicando que fue análisis del propio texto cuando `url` es `null`) — y ahora también `GET /history` para listar análisis anteriores del usuario logueado, y `fullName` (vía `GET /me`) para saludar al usuario por su nombre.
11. `backend/claude.md` tiene una regla importante: **no ejecutar acciones de git en el repo salvo que Ciro lo pida explícitamente en ese momento** (nada de add/commit/push/pull/branches de forma proactiva).
12. Recordar que la conexión a Cloud SQL desde local depende de `gcloud auth application-default login` (ADC) — si en algún momento vuelve a aparecer `Could not load the default credentials`, probablemente las credenciales ADC expiraron o se corrió en otra cuenta de Windows; volver a correr ese comando lo soluciona.
---
 
## Dependencias Instaladas (backend/)
 
**Producción (`dependencies`):**
| Paquete | Versión | Uso |
|---|---|---|
| `express` | 5.2.1 | Framework del servidor |
| `axios` | 1.18.1 | Requests HTTP en cheerioScraper |
| `cheerio` | 1.2.0 | Parseo de HTML |
| `puppeteer` | 25.3.0 | Navegador headless para sitios con JS |
| `@google/genai` | 2.15.0 (al momento de instalar) | SDK oficial de Gemini — reemplazo del deprecado `@google/generative-ai` |
| `@google-cloud/cloud-sql-connector` | ^1.11.3 | Túnel seguro (IAM) hacia la instancia de Cloud SQL |
| `pg` | ^8.23.0 | Cliente PostgreSQL para Node |
| `dotenv` | ^17.4.2 | Carga de `.env` (necesario porque `tsx` no lo hace solo) |
| `firebase-admin` | ^14.3.0 | Verificación de ID tokens de Firebase Auth (`auth/firebaseAdmin.ts`) — instalado y confirmado funcionando (31-ago-2026) |
 
**Desarrollo (`devDependencies`):**
| Paquete | Versión | Uso |
|---|---|---|
| `typescript` | 7.0.2 | Compilador de TS (reescritura nativa en Go, GA desde jul-2026) |
| `@types/node` | 26.1.1 | Tipos de Node |
| `@types/express` | 5.0.6 | Tipos de Express |
| `@types/pg` | ^8.23.1 | Tipos de `pg` |
| `tsx` | 4.23.1 | Motor de desarrollo — reemplazo de ts-node-dev por incompatibilidad con TS 7 |
| ~~`ts-node-dev`~~ | 2.0.0 | **Descartado** — incompatible con TS 7, reemplazado por `tsx` |
| ~~`nodemon`~~ | — | **Obsoleto** para este proyecto, no compila TS. Se puede desinstalar |
 
> Confirmado con `npm list --depth=0` el 16/07/2026. Si se instala algo nuevo, volver a correr ese comando y actualizar esta tabla (pendiente re-confirmar tras agregar `@google-cloud/cloud-sql-connector` y `pg`).
 
**Herramientas adicionales instaladas en la máquina (no npm, nivel sistema):**
| Herramienta | Uso |
|---|---|
| Google Cloud CLI (`gcloud`) | Necesaria para `gcloud auth application-default login` — genera las credenciales ADC que usa `@google-cloud/cloud-sql-connector` para conectarse a Cloud SQL desde local |
 
**Variables de entorno requeridas (`.env`):**
| Variable | Uso |
|---|---|
| `GEMINI_API_KEY` | Autenticación con la API de Gemini (leída de forma perezosa en `gemini/geminiClient.ts`) |
| `PORT` | Puerto del server Express (opcional, default 3000) |
| `DATABASE_URL` | **En uso actualmente.** Conexión directa a Postgres local (`postgresql://postgres:<password>@localhost:5432/aletheia`) — mientras esté seteada, `pool.ts` la usa y ni mira las variables de Cloud SQL de abajo |
| `INSTANCE_CONNECTION_NAME` | Conexión a Cloud SQL — `PROJECT:REGION:INSTANCE` — **solo para modo nube; sin uso mientras `DATABASE_URL` esté seteada** (la instancia real fue borrada, ver "Módulo DB") |
| `DB_USER` | Usuario de la base Postgres en Cloud SQL (`aletheia-app`) — solo modo nube, sin uso actualmente |
| `DB_PASSWORD` | Password del usuario de Cloud SQL — solo modo nube, sin uso actualmente |
| `DB_NAME` | Nombre de la base de datos en Cloud SQL (`aletheia`) — solo modo nube, sin uso actualmente |
| `FIREBASE_PROJECT_ID` | ID del proyecto de Firebase, usado por `auth/firebaseAdmin.ts` para inicializar el Admin SDK — **completa y funcionando** |
 
---
 
## Entorno de Desarrollo
 
- Node.js v22.19.0
- npm v11.6.2
- Git instalado
- **PostgreSQL local instalado** (31-ago-2026, instalador nativo de Windows con pgAdmin 4) — el motor de desarrollo actual, ver "Módulo DB"
- Google Cloud CLI (`gcloud`) instalado (agregado 24-ago-2026; ya no imprescindible para el día a día desde que se pivotó a Postgres local, pero se mantiene para cuando se vuelva a modo Cloud SQL)
- Cuenta Google Cloud activa (proyecto "My First Project", sin organización propia — política de seguridad "secure by default" bloquea la creación de claves de cuenta de servicio, por eso se usa ADC de la cuenta personal en vez de una service account key cuando se usa Cloud SQL)
- Proyecto de Firebase agregado sobre ese mismo proyecto de GCP, con Authentication activado (Google + Email/Password)
- Windows (PowerShell como terminal principal — cuidado con el escapado de comillas en JSON al usar `curl`; preferir `Invoke-RestMethod` o herramientas como Postman/Thunder Client)