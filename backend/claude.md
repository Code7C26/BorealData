# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Reglas de trabajo — IMPORTANTE

**No ejecutar ninguna acción de git en este repositorio salvo que el usuario lo pida explícitamente en ese momento.** Esto incluye (sin limitarse a): `git add`, `git commit`, `git push`, `git pull`, crear ramas, o cualquier otro comando de git. No lo hagas de forma proactiva al terminar una tarea, ni lo sugieras como "siguiente paso" a menos que se te pida. El usuario maneja el control de versiones manualmente.

## Sobre este repositorio

`backend/` es el servicio Node.js + Express (TypeScript) de **aletheIA** (Boreal Data), un sistema de detección de fake news: recibe una URL, scrapea el artículo y lo analiza con Gemini para devolver un score de veracidad (0–100) con etiqueta y explicación. Este directorio es un subdirectorio del monorepo (el repo git raíz es un nivel arriba); las apps de frontend (`web`, `extension`, `mobile`) viven fuera de este checkout. Deploy target: Cloud Run.

## Comandos

- `npm run dev` — arranca el server con `tsx watch src/index.ts` (hot reload). **No chequea tipos**, solo transpila con esbuild.
- `npm run build` — corre `tsc` completo (chequeo de tipos real) y compila a `dist/`.
- `npm start` — corre el build compilado (`node dist/index.js`).
- No hay test runner ni script de test configurado todavía.

### Variables de entorno

`.env` (gitignored) requiere `GEMINI_API_KEY`. `PORT` es opcional (default 3000). Se cargan con `import "dotenv/config"` como primera línea de `src/index.ts` — si se agrega un nuevo entry point, necesita el mismo import o las env vars no van a llegar a `process.env`.

### Particularidad de toolchain

El proyecto usa **TypeScript 7** (compilador nativo en Go) + **tsx** como motor de dev. No instalar ni usar `ts-node` / `ts-node-dev`: son incompatibles con TS7 (tira `TypeError: Cannot read properties of undefined (reading 'fileExists')`) porque no exponen la API de compilador tradicional que esas herramientas necesitan. `nodemon` tampoco se usa (no compila TS).

## Arquitectura

Flujo de la única ruta implementada: `POST /analyze` → `scrapeUrl()` → `analyzeContent()` → responde JSON combinado. Todavía **sin persistencia (Cloud SQL) ni autenticación (JWT/Firebase Auth)** — cualquier tarea de guardado o auth es funcionalidad nueva, no algo que ya exista parcialmente.

### `src/scraper/` — extracción de contenido

`scrapeUrl.ts` es el único punto de entrada. Intenta primero `cheerioScraper.ts` (axios + cheerio, HTML estático, con User-Agent de navegador real y `validateStatus: () => true` para manejar 4xx/5xx manualmente). Se considera insuficiente (`success: false`) si el texto extraído tiene menos de `minTextLength` (default 500 caracteres) o si detecta un shell de SPA vacío (`#root`, `#app`, `#__next`, `[data-reactroot]` con menos de 50 caracteres). En ese caso cae a `puppeteerScraper.ts` (Chrome headless, espera `networkidle2`, y le pasa el HTML final resultante a cheerio para extraer el texto con la misma lógica). Ambos devuelven siempre la misma forma `ScrapedContent` (`types.ts`), sin importar qué método se usó.

Bug conocido no bloqueante: bloques de resumen en viñetas dentro de un `h1/h2/h3` (ej. `h2.storySummary` de Clarín) no se extraen bien; el cuerpo principal del artículo sí se extrae correctamente.

### `src/gemini/` — análisis de veracidad

`analyzeContent.ts` es el punto de entrada. Antes de gastar una llamada a la API, corta camino a `label: "no_verificable"` si `scraped.success` es `false` o si el texto tiene menos de 200 caracteres. `geminiClient.ts` hace el trabajo real:

- El cliente `GoogleGenAI` se instancia de forma perezosa (`getClient()`) para que la falta de `GEMINI_API_KEY` no rompa el arranque del server, solo falle cuando `/analyze` la necesite.
- `buildPrompt()` incluye una regla explícita anti-knowledge-cutoff: el modelo no debe calificar algo como falso solo porque contradice su conocimiento de entrenamiento, y debe verificar con búsqueda web antes de penalizar. Esto corrige un bug real detectado (una noticia real post-cutoff fue calificada como falsa).
- `callGemini()` llama a `generateContent` con `tools: [{ googleSearch: {} }]` (grounding vía Google Search) y trunca el input a `maxInputChars` (default 12000).
- **Restricción de la API de Gemini:** `responseMimeType: "application/json"` no se puede combinar con `tools` (tira 400 `INVALID_ARGUMENT`). Por eso el JSON se pide por instrucciones en el prompt (bloque ```` ```json ````) y se parsea de forma tolerante con `extractJsonBlock()` (busca el bloque fenced, si no existe cae al primer `{` hasta el último `}`) + `parseGeminiResponse()` (valida y clampea `score` a 0–100, valida `label` contra el enum `VeracityLabel`). No reintroducir `responseMimeType` mientras se use grounding.
- `parseGeminiResponse()` está exportada aparte de `callGemini()` para poder testearla con strings fijos sin pegarle a la API real.

### `src/routes/analyze.ts`

`POST /analyze`, body `{ "url": string }`. Códigos de respuesta: `400` (falta `url`), `422` (el scraper no pudo extraer contenido, devuelve el objeto `scraped` completo), `502` (Gemini falló, devuelve `detail` + metadata del scraping), `200` (resultado combinado), `500` (error inesperado no controlado).

## Estado pendiente relevante

- Guardado en Cloud SQL (tabla `analyses`) y verificación JWT en `/analyze` — siguiente paso lógico, todavía no implementado.
- Endpoint `GET /history` — no existe todavía.
- Bug menor del resumen en viñetas tipo Clarín en el scraper (ver arriba) — no bloqueante.
