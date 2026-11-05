# Arquitectura de AletheIA

Documento de referencia técnica: componentes, contrato del análisis, decisiones de
diseño y particularidades conocidas de cada plataforma. La puesta en marcha está en el
[README](../../README.md).

## Componentes

| Componente | Carpeta | Descripción |
|---|---|---|
| Web | `apps/` | Next.js (App Router). Landing, autenticación, análisis, historial, perfil, resultado público. |
| Extensión | `apps/extension/` | WXT + React. Side panel que analiza la pestaña activa, capturas y selecciones. |
| App móvil | `mobile/` | Expo + Expo Router. Análisis por enlace, texto, pregunta o captura de la galería. |
| Backend | `backend/` | Express. Scraping, llamada a Gemini, persistencia en Postgres. |

Las tres superficies comparten el backend y el proyecto de Firebase. El cliente obtiene
un ID token de Firebase Authentication y lo envía en `Authorization: Bearer <token>`; el
backend lo verifica con Firebase Admin (`backend/src/auth/`).

## API REST

| Método y ruta | Autenticación | Descripción |
|---|---|---|
| `GET /` | No | Estado del servicio. |
| `POST /analyze` | Sí | Analiza una URL (scraping + Gemini). Reutiliza un análisis previo de la misma URL e idioma. |
| `POST /analyze/read` | Sí | Paso 1 del análisis de imágenes: transcribe hasta 3 imágenes sin emitir veredicto. |
| `POST /analyze/content` | Sí | Paso 2: verifica contenido aportado por el cliente (texto, selección, captura, pregunta). |
| `GET /analyses/:id` | Opcional | Devuelve un análisis. Sin sesión, solo análisis de URLs públicas; con sesión, también los propios. |
| `DELETE /analyses/:id` | Sí | Borra un análisis propio. |
| `GET /history` | Sí | Historial del usuario. |
| `DELETE /history` | Sí | Borra todo el historial del usuario. |
| `GET /me`, `POST /me`, `DELETE /me` | Sí | Perfil del usuario; `DELETE` elimina la cuenta y sus análisis en una transacción. |
| `GET /stats` | No | Totales agregados de la plataforma. |

`POST /analyze/read` monta su propio `express.json()` con límite de 3 MB y se registra
antes del parser global (100 kB) en `backend/src/index.ts`.

## Contrato del análisis

El análisis devuelve un **veredicto** (`verificado`, `dudoso`, `falso`, `sin-datos`) y
una **confianza** de 1 a 5, como valores independientes. Reglas:

- `sin-datos` nunca supera confianza 2.
- `falso` y `verificado` nunca bajan de confianza 3.
- Una combinación fuera de tabla se degrada a `sin-datos`.

La regla se aplica en `normalizeVerdict` (`backend/src/gemini/types.ts`), en `normalize`
(`apps/lib/verdict.ts` y `mobile/src/lib/verdict.ts`) y en una CHECK constraint de la
base. Los tres archivos de vocabulario deben mantenerse sincronizados.

La respuesta incluye además `headline`, `lead`, `summary`, `reasoning`, `sources` (con
postura respecto de la afirmación) y `toneFlags`.

### Pipeline de URL

1. `validateUrl.ts` descarta protocolos no HTTP, IPs privadas o internas y DNS rebinding (SSRF).
2. `scrapeUrl.ts` intenta Cheerio; `extractArticle.ts` aísla el cuerpo de la nota
   (el contenedor que concentra el texto en párrafos). Si el texto tiene menos de 500
   caracteres, es un shell de SPA vacío o no se corresponde con el título, recurre a
   Puppeteer y aplica la misma extracción al HTML renderizado.
3. `analyzeContent.ts` corta en `sin-datos` si no hay contenido suficiente, sin llamar a Gemini.
4. `geminiClient.ts` llama a Gemini con `tools: [{ googleSearch: {} }]`, incluye la fecha
   actual en el prompt (sin ella, el modelo razona desde su fecha de corte) y parsea la
   respuesta.

**Restricción de Gemini:** `responseMimeType: "application/json"` no puede combinarse con
`tools` (error 400 `INVALID_ARGUMENT`). El JSON se solicita en el prompt y se extrae de
forma tolerante con `extractJsonBlock()` y `parseGeminiResponse()`.

**Fuentes del grounding:** `groundingChunks[].web.uri` es siempre una URL de redirección
de `vertexaisearch.cloud.google.com`; el dominio del medio llega en `web.title`. El cruce
entre las fuentes citadas por el modelo y los chunks se hace contra `web.title`
(`toGroundingLink`). Las filas antiguas con dominio `vertexaisearch…` se normalizan al
leerlas en `analysesRepository.ts`.

**Idioma:** el cliente envía `language` (`es` o `en`) y Gemini redacta el análisis en ese
idioma. `idiomaSalida.ts` traduce los campos que hayan quedado en castellano cuando se
pidió inglés. La caché de `/analyze` se indexa por `(url, language)`.

### Análisis de contenido del cliente

Las páginas con login (redes sociales, mensajería) no pueden leerse desde el servidor.
En esos casos el cliente envía la evidencia que ya tiene en pantalla:

1. **Lectura** (`POST /analyze/read`, `readCapture.ts`): llamada multimodal sin
   herramientas, con salida JSON estructurada. Devuelve la transcripción y la afirmación
   central, sin veredicto.
2. **Revisión:** el cliente muestra la transcripción para que pueda corregirse.
3. **Verificación** (`POST /analyze/content`): el texto confirmado pasa por el mismo
   `callGemini()` con grounding que usa `/analyze`.

Se separa en dos llamadas porque la salida JSON estructurada y la búsqueda son
incompatibles en una misma llamada, y porque la revisión intermedia mejora la calidad
del veredicto.

Reglas de privacidad del flujo:

- La captura solo se toma ante una acción explícita (botón o menú contextual).
- La imagen no se persiste ni se registra en logs; en la base quedan el texto y el veredicto.
- Los análisis con `source_type` distinto de `url` quedan excluidos de la caché compartida,
  del enlace público y de `/stats`. `pageUrl` es solo un dato de contexto y nunca se scrapea.

### Límites de uso

`backend/src/utils/analyzeLimiter.ts`: 20 análisis por hora y usuario, compartidos entre
`/analyze` (sin contar aciertos de caché) y `/analyze/content`; 60 lecturas por hora en
`/analyze/read`. El contador vive en memoria del proceso: con varias instancias el límite
se multiplica, por lo que en ese escenario debe trasladarse a un almacenamiento compartido.

### Logging

`backend/src/utils/logger.ts` emite una línea JSON por evento con las claves de Cloud
Logging (`severity`, `message`): latencia, veredicto, método de scraping, acierto de caché
y cantidad de fuentes con enlace. El contenido analizado nunca se registra.

## Base de datos

El esquema completo está en `backend/src/db/schema.sql`. El pool (`pool.ts`) usa
`DATABASE_URL` si está definida; en caso contrario, Cloud SQL Connector con
`INSTANCE_CONNECTION_NAME`, `DB_USER`, `DB_PASSWORD` y `DB_NAME`.

### Row Level Security

El backend se conecta con el rol `aletheia_app`, que no es dueño de las tablas. Las
policies limitan cada usuario a sus propias filas de `users` y `analyses`, con
excepciones explícitas para el enlace público de resultado, la caché por URL y el
agregado de `/stats`. Cada request corre en una transacción con el usuario fijado de
forma local (`db/context.ts`).

Consecuencias operativas:

- Un `SELECT count(*)` ejecutado como `aletheia_app` no refleja el total real de filas.
- El rol de la aplicación no puede aplicar migraciones (falla con `42501`).
- Si el código queda por delante del esquema, los repositorios devuelven listas vacías:
  ante un historial vacío sin error, verificar primero `information_schema.columns`.

### Migraciones

Scripts idempotentes en `backend/`, ejecutados con el rol dueño de las tablas:

| Script | Cambio |
|---|---|
| `migrate.ts` | Columnas de veredicto, confianza, titular, bajada y razonamiento. |
| `migrate-rls.ts` | Rol `aletheia_app`, RLS y policies. |
| `migrate-content.ts` | `source_type` y `capture_platform`; excluye contenido del cliente de lo compartido. |
| `migrate-delete.ts` | Permiso DELETE y policies de borrado. |
| `migrate-language.ts` | Columna `language` y caché por idioma. |
| `migrate-question.ts` | Agrega `question` a los valores admitidos de `source_type`. |
| `verify-rls.ts` | Comprueba el aislamiento entre usuarios (solo lectura). |

```bash
MIGRATION_DATABASE_URL=postgres://postgres:<password>@localhost:5432/aletheia \
  npx tsx migrate-question.ts
```

En Windows, `node node_modules/tsx/dist/cli.mjs <script>.ts` evita el bloqueo de
`npx.ps1` por la política de ejecución de PowerShell. El SQL equivalente puede aplicarse
también desde la sección correspondiente de `schema.sql`.

## Web

- Rutas autenticadas en `app/(autenticado)/`; páginas informativas públicas
  (`/contacto`, `/privacidad`, `/terminos`) en `app/(info)/`, cuyo layout muestra el
  sidebar si hay sesión.
- `/resultado/:id` es la vista canónica de un análisis guardado: se puede recargar y
  compartir, y genera metadatos Open Graph con `generateMetadata()`. `/resultado` (sin id)
  muestra desde `sessionStorage` los análisis que no llegaron a guardarse.
- Idioma: cookie `aletheia-idioma` leída en el layout raíz; los textos se declaran por
  componente con `traducciones({ es, en })`, que exige la misma forma en ambos idiomas.
- Tema claro/oscuro con `data-theme` en `<html>` (`lib/theme.ts`).
- `lib/extension-bridge.ts` comparte la sesión con la extensión; solo cierra la sesión de
  la extensión ante una transición real de usuario a `null`.

## Extensión de Chrome

- Interfaz como side panel (`chrome.sidePanel`), entrypoint `entrypoints/sidepanel/`.
- `background.ts` ejecuta los análisis (sobreviven al cierre del panel), el menú
  contextual "Analizar con AletheIA" y la captura con recorte.
- `auth-bridge.content.ts` recibe la sesión desde la web.
- `chrome.sidePanel.close()` no tiene efecto si se llama desde el propio panel; debe
  invocarse desde el background.

## App móvil

- `src/lib/verdict.ts`, `src/lib/api.ts` y `src/lib/idioma.ts` replican los módulos
  homónimos de `apps/lib/`.
- `src/theme/tokens.ts` traslada el sistema de diseño (paleta y roles semánticos).
- `src/lib/config.ts` deduce la URL del backend a partir del host de Metro; en el
  emulador de Android, el host se alcanza en `10.0.2.2`.
- La preferencia de idioma se guarda en AsyncStorage.

Particularidades en [mobile/README.md](../../mobile/README.md).

## Despliegue

`docker-compose.yml` define tres servicios para un stack de Docker Swarm. Ninguno
publica puertos: Traefik (red externa `Kobacnet`) termina HTTPS con Let's Encrypt y
enruta por dominio.

| Servicio | Imagen | Acceso |
|---|---|---|
| `postgres` | `postgres:15-alpine` | Solo red interna. |
| `web` | `Dockerfile` (Next.js `standalone`, puerto 4000) | `aletheiainc.online` y `www`. |
| `backend` | `backend/Dockerfile` (Node 24 + Chromium, puerto 8080) | `aletheiainc.online/api`; Traefik quita el prefijo `/api`. |

- Swarm ignora la clave `build:` del compose: las imágenes se construyen con
  `docker build` antes de cada despliegue.
- Las variables `NEXT_PUBLIC_*` se pasan como build args porque Next.js las incorpora al
  bundle durante el build.
- `CORS_ORIGIN` lista los orígenes de la web separados por coma, sin ruta.
- La imagen del backend instala Chromium de Debian y define `PUPPETEER_EXECUTABLE_PATH`
  y `PUPPETEER_SKIP_DOWNLOAD`, de modo que Puppeteer no descarga su propio navegador.
- La API key de Firebase está restringida por HTTP referrer; cada origen nuevo (dominio
  de la web, `chrome-extension://<ID>`) debe agregarse en Google Cloud Console.

## Tests

Vitest en `backend/` y `apps/`. Cubren la tabla veredicto × confianza,
`parseGeminiResponse` (con fixtures de la forma real de `groundingChunks`), la
traducción del idioma de salida, la defensa contra SSRF (incluidas direcciones IPv4
mapeadas en IPv6 en notación hexadecimal) y la sanitización de texto y URLs.
