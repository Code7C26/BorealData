# Arquitectura de AletheIA

Documento de referencia técnica: componentes, contrato del análisis, decisiones de
diseño y particularidades conocidas de cada plataforma. La puesta en marcha está en el
[README](../../README.md).

## Componentes

| Componente | Carpeta | Descripción |
|---|---|---|
| Web | `apps/` | Next.js (App Router). Landing, autenticación, análisis, historial, perfil, resultado público. |
| Extensión | `apps/extension/` | WXT + React. Side panel que analiza la pestaña activa, capturas y selecciones. |
| Backend | `backend/` | Express. Scraping, llamada a Gemini, persistencia en Postgres. |

Las dos superficies comparten el backend y el proyecto de Firebase. El cliente obtiene
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
| `GET /me`, `POST /me`, `DELETE /me` | Sí | Perfil del usuario (`GET` incluye el `plan` vigente, para ocultar anuncios en Premium); `DELETE` cancela la suscripción y elimina la cuenta y sus análisis en una transacción. |
| `GET /stats` | No | Totales agregados de la plataforma. |
| `GET /plan` | Sí | "Tu plan": plan vigente, uso del mes, precio y si quedan días de arrepentimiento. |
| `POST /plan/suscribir` | Sí | Crea la suscripción de Mercado Pago y devuelve el `initPoint` del checkout. |
| `POST /plan/sincronizar` | Sí | Relee la suscripción en Mercado Pago y la aplica (respaldo del webhook). |
| `POST /plan/cancelar` | Sí | Botón de baja o de arrepentimiento (`tipo`); devuelve el código de la constancia. |
| `POST /plan/solicitud` | No | Baja o arrepentimiento sin sesión: deja la constancia pendiente. |
| `POST /webhooks/mercadopago` | Firma | Avisos de suscripciones de Mercado Pago (valida `x-signature`). |

`POST /analyze/read` monta su propio `express.json()` con límite de 3 MB y se registra
antes del parser global (100 kB) en `backend/src/index.ts`.

## Contrato del análisis

El análisis devuelve un **veredicto** (`verificado`, `dudoso`, `falso`, `sin-datos`) y
una **confianza** de 1 a 5, como valores independientes. Reglas:

- `sin-datos` nunca supera confianza 2.
- `falso` y `verificado` nunca bajan de confianza 3.
- Una combinación fuera de tabla se degrada a `sin-datos`.

La regla se aplica en `normalizeVerdict` (`backend/src/gemini/types.ts`), en `normalize`
(`apps/lib/verdict.ts` y `apps/extension/lib/analysis.ts`) y en una CHECK constraint de la
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

`backend/src/utils/analyzeLimiter.ts`: 20 análisis por hora y usuario (60 en Premium), compartidos entre
`/analyze` (sin contar aciertos de caché) y `/analyze/content`; 60 lecturas por hora en
`/analyze/read`. El contador vive en memoria del proceso: con varias instancias el límite
se multiplica, por lo que en ese escenario debe trasladarse a un almacenamiento compartido.

Además de esa ráfaga por hora, cada plan tiene un **cupo** que vive en Postgres (tabla
`uso_analisis`, `backend/src/plan/controlDeCupo.ts`): **Gratuito, 5 por día**, que se
renueva a la medianoche; **Premium, 150 por mes** de uso justo, que se renueva el día 1.
Los dos en hora de Buenos Aires, y cuentan lo mismo que el límite por hora (`/analyze`
sin acierto de caché y `/analyze/content`). Los números están en
`backend/src/plan/config.ts` (`CUPOS`); la fila de `uso_analisis` lleva la `ventana`
(`dia` o `mes`) en la clave, porque el día 1 de un mes es a la vez un día y un mes.
El análisis se descuenta antes de llamar a Gemini con un único
`INSERT ... ON CONFLICT DO UPDATE ... WHERE analisis < tope` —dos pedidos simultáneos no
pueden pasarse del tope— y se devuelve si el scraping o Gemini fallan. Al agotarse
responde `429` con `code: "cupo_agotado"`, `plan`, `ventana`, `limite` y `renueva`; la web lo
detecta y lleva a "Tu plan". Si la base falla, deja pasar y lo registra como error.

### Plan pago (Mercado Pago)

Premium es una suscripción mensual de Mercado Pago sin plan asociado (`POST /preapproval`
con `status: "pending"`): la persona paga en el checkout de Mercado Pago y la tarjeta
nunca pasa por el backend. La suscripción lleva el `firebase_uid` en
`external_reference`.

1. "Empezar con Premium" (landing → registro → `/configuracion/plan?suscribir=1`) llama a
   `POST /plan/suscribir`, que guarda el `mp_preapproval_id` y devuelve el `initPoint`.
2. Al pagar, Mercado Pago avisa a `POST /webhooks/mercadopago`. El webhook valida la
   firma (`x-signature`, HMAC-SHA256 con `MP_WEBHOOK_SECRET`), **vuelve a pedir la
   suscripción a la API** (nunca confía en el body) y la aplica: `authorized` → Premium
   hasta el próximo cobro más 3 días de gracia; `paused`/`cancelled` → Gratuito. También
   procesa `subscription_authorized_payment` (cada cobro mensual renueva `plan_hasta`).
3. Solo se aplica si la suscripción coincide con el `mp_preapproval_id` guardado: un aviso
   tardío de una suscripción vieja no pisa la vigente. Corre con el contexto RLS del
   usuario del `external_reference`, sin bypass.
4. Al volver del checkout (`back_url`), "Tu plan" llama a `POST /plan/sincronizar`, que
   hace lo mismo que el webhook. Es lo que hace andar el flujo en local, donde el webhook
   no llega sin un túnel público.

Premium vale mientras `plan_hasta` no venció: si un cobro falla y nunca llega el aviso de
baja, la cuenta vuelve sola a Gratuito. `DELETE /me` cancela la suscripción antes de
borrar la cuenta.

**Baja y arrepentimiento (Disposición 954/2025).** Los dos botones están en el pie de la
landing y en `/baja`, que es pública. Con sesión, `POST /plan/cancelar` cancela la
suscripción en Mercado Pago y baja la cuenta en el momento; el arrepentimiento (dentro de
los 10 días desde que empezó Premium) además reintegra los cobros. Sin sesión,
`POST /plan/solicitud` no puede probar que la cuenta es de quien pide, así que no cancela
nada: deja una constancia `pendiente` con el email para resolverla a mano. Cada pedido
queda en `solicitudes_plan` y su `id` es el código que se le muestra a la persona.

**Modo prueba.** Con las credenciales de una cuenta de prueba vendedora en
`MP_ACCESS_TOKEN` y el email de la compradora en `MP_TEST_PAYER_EMAIL` (Mercado Pago exige
que `payer_email` sea quien paga), se paga con las
[tarjetas de prueba](https://www.mercadopago.com.ar/developers/es/docs/your-integrations/test/cards)
iniciando sesión en el checkout con la cuenta compradora. "Tu plan" muestra un aviso de
modo prueba. Para cobrar de verdad hace falta la cuenta de una persona mayor de edad con
CUIT y monotributo, y emitir factura C.

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
| `migrate-plan.ts` | Plan pago: `plan`, `plan_desde`, `plan_hasta` y `mp_preapproval_id` en `users`; tablas `uso_analisis` y `solicitudes_plan` con RLS. Sin correrla no hay tope por plan, "Tu plan" responde 503 y `GET /me` informa `plan: "gratuito"`. |
| `migrate-plan.sql` | Lo mismo que `migrate-plan.ts` en SQL puro, para el servidor (sin Node): `docker exec -i <id> psql -U postgres -d aletheia < migrate-plan.sql`. Deja las tablas nuevas con el mismo dueño que `users`. |
| `dar-premium.ts` | No es una migración: da o saca Premium a mano a cuentas del equipo (expo, demos), sin Mercado Pago. Corre `migrate-plan.ts` si falta. |
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
mapeadas en IPv6 en notación hexadecimal), la sanitización de texto y URLs, el cupo
por plan (5 por día en Gratuito, 150 por mes en Premium, día y mes en hora argentina, devolución si el análisis falla) y el
webhook de Mercado Pago (firma, estados de la suscripción y avisos de cobro).
