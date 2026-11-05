# CLAUDE.md

Guía para agentes de código que trabajan en `backend/`.

## Reglas de trabajo

No ejecutar comandos de git (`add`, `commit`, `push`, `pull`, ramas) salvo pedido
explícito en el momento. El control de versiones se maneja manualmente.

## Descripción

API REST de AletheIA (Node.js + Express 5 + TypeScript). Recibe una URL o contenido
aportado por el cliente, extrae el texto y lo analiza con Gemini para devolver un
veredicto (`verificado`, `dudoso`, `falso`, `sin-datos`) con un nivel de confianza de 1 a
5. Persiste los análisis en PostgreSQL con Row Level Security. La documentación de
arquitectura está en `../DOCS/ARQUITECTURA.md`.

## Comandos

- `npm run dev`: `tsx watch src/index.ts`. Transpila sin chequear tipos.
- `npm run build`: `tsc` con chequeo de tipos completo; salida en `dist/`.
- `npm start`: ejecuta `dist/index.js`.
- `npm test`: Vitest.

## Variables de entorno

Ver `.env.example`. Se cargan con `import "dotenv/config"` en `src/index.ts`; cualquier
entry point nuevo (por ejemplo, un script de migración) necesita el mismo import.

## Toolchain

El proyecto usa TypeScript 7 (compilador nativo) y `tsx`. `ts-node`, `ts-node-dev` y
`nodemon` no son compatibles: TypeScript 7 no expone la API de compilador que requieren.

## Estructura

- `src/routes/`: un archivo por grupo de endpoints (`analyze`, `analyzeRead`,
  `analyzeContent`, `analyses`, `history`, `me`, `stats`).
- `src/scraper/`: `scrapeUrl.ts` intenta `cheerioScraper.ts` y recurre a
  `puppeteerScraper.ts` cuando el texto es insuficiente o la página es un shell de SPA.
  Ambos devuelven `ScrapedContent`.
- `src/gemini/`: `geminiClient.ts` arma el prompt, llama a Gemini con grounding y parsea
  la respuesta; `readCapture.ts` transcribe imágenes; `types.ts` define el contrato y
  `normalizeVerdict`; `idiomaSalida.ts` corrige el idioma de salida.
- `src/db/`: pool, repositorios, contexto de usuario para RLS y `schema.sql`.
- `src/auth/`: verificación del ID token de Firebase (`requireAuth`, `attachUserIfPresent`).
- `src/utils/`: validación de URLs (SSRF), sanitización, rate limit, logging.

## Restricciones conocidas

- Gemini no admite `responseMimeType: "application/json"` junto con `tools`. Mientras se
  use grounding, el JSON se pide en el prompt y se parsea con `extractJsonBlock()` y
  `parseGeminiResponse()`.
- Los clientes de Gemini y de Postgres se crean de forma perezosa para que la falta de
  variables no impida el arranque del servidor.
- El rol `aletheia_app` no puede aplicar migraciones; los scripts `migrate*.ts` se
  ejecutan con el rol dueño de las tablas.
- Los bloques de resumen en viñetas dentro de encabezados (por ejemplo, `h2.storySummary`)
  no se extraen correctamente; el cuerpo del artículo sí.
