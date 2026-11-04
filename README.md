<p align="center">
  <img 
    src="/assets/logoAletheia-banner.svg"
    alt="AletheIA — Boreal Data"
    width="360px"
  />
</p>
<h1 align="center">aletheIA</h1>

<h3 align="center">Detector inteligente de fake news</h3>

<p align="center"><i>Boreal Data — 2026</i></p>

<p align="center">
  <a href="https://aletheiainc.online">aletheiainc.online</a> ·
  <a href="https://chromewebstore.google.com/detail/djnafnjbmkdkmigadknjhbckdhklhoeh">Extensión en la Chrome Web Store</a>
</p>

---

## Descripción del problema

Vivimos en una era donde la información circula más rápido que la capacidad de verificarla.
Las fake news se propagan en redes sociales, portales de noticias y grupos de mensajería
generando confusión, polarización y decisiones basadas en datos falsos. La mayoría de las
personas no tiene ni el tiempo ni las herramientas para verificar cada noticia que consume.

Este problema afecta especialmente a jóvenes y adultos que consumen contenido digital de
forma masiva y cotidiana, sin contar con un mecanismo rápido y accesible para distinguir
información verdadera de desinformación.

---

## Propuesta de solución

**aletheIA** es un sistema multiplataforma que analiza noticias y publicaciones en
tiempo real y devuelve un veredicto claro junto con una explicación fundamentada. El
usuario puede verificar desde la web **un enlace, un texto, una pregunta o una captura
de pantalla**, o usar la extensión de Chrome para analizar la página que está leyendo
sin salir de ella.

El análisis combina extracción automática del contenido (scraping, o lectura de la
imagen con IA cuando es una captura) con un modelo de inteligencia artificial (Gemini,
con grounding vía Google Search) que evalúa el texto, cruza fuentes reales y devuelve
**uno de 4 veredictos** (`verificado`, `dudoso`, `falso`, `sin-datos`) junto con **un
nivel de confianza de 1 a 5** — dos cosas separadas: el veredicto es la conclusión, la
confianza dice qué tan sólida es la evidencia detrás. No hay un porcentaje de veracidad:
un "72%" comunicaría una precisión decimal que el análisis no tiene.

---

## Público objetivo

- **Usuarios generales** que consumen noticias en internet y quieren verificar información
  antes de compartirla.
- **Estudiantes y docentes** que necesitan validar fuentes para trabajos académicos.
- **Periodistas y comunicadores** que requieren una primera validación rápida de contenido.

aletheIA les mejora la vida dándoles una herramienta accesible, rápida y sin fricción
que se integra directamente en su navegador sin interrumpir su flujo de navegación.

---

## Stack tecnológico

### Superficies

| Superficie | Tecnología | Detalle |
|---|---|---|
| Web | Next.js 16 (App Router) + React 19 + TypeScript | Tailwind CSS 4, Base UI, lucide-react. Build `standalone` para Docker |
| Extensión | WXT 0.21 + React 19 (Manifest V3) | Side panel de Chrome. Publicada en la Chrome Web Store |
| Mobile | Expo SDK 58 + React Native 0.88 + Expo Router | App iOS y Android (todavía sin publicar) |

### Backend y análisis

| Capa | Tecnología | Detalle |
|---|---|---|
| API | Node.js 24 + Express 5 + TypeScript 7 | `tsx` en desarrollo, `tsc` para el build, Vitest para tests |
| Scraping | Cheerio + Puppeteer | Cheerio primero; Puppeteer (Chromium headless) si la página necesita JS |
| IA | Gemini (`@google/genai`) | `gemini-2.5-flash` con grounding vía Google Search. Lectura de capturas con el mismo modelo (configurable con `GEMINI_READ_MODEL`) |
| Base de datos | PostgreSQL (`pg`) | Postgres 15 en Docker en producción; Postgres local en desarrollo. Row Level Security. Cloud SQL soportado vía connector, sin uso actual |
| Autenticación | Firebase Auth | Google y email/contraseña. El backend verifica el ID token con `firebase-admin` |

### Infraestructura

| Pieza | Tecnología | Detalle |
|---|---|---|
| Servidor | VPS + Docker Swarm | Stack definido en `docker-compose.yml`, administrado con Portainer |
| Proxy / HTTPS | Traefik + Let's Encrypt | `aletheiainc.online` → web; `aletheiainc.online/api` → backend |
| Imágenes | Docker | `Dockerfile` (web, Node 20 Alpine) y `backend/Dockerfile` (Node 24 + Chromium de Debian) |
| DNS | Hostinger | Registro A a la IP del VPS y `www` como CNAME |

---

## Estructura del repositorio

```
aletheIA/
│
├── apps/                  → Web (Next.js)
│   ├── app/               → Rutas (App Router): home, login, registro, dashboard,
│   │                         historial, configuración, perfil, resultado privado y
│   │                         público (/resultado/:id), páginas legales
│   ├── components/        → navbar, sidebar, hero, aurora, result/, etc.
│   ├── lib/               → api.ts, auth-context.tsx, verdict.ts, theme.ts,
│   │                         extension.ts (link a la Web Store), extension-bridge.ts
│   └── extension/         → Extensión de Chrome (WXT)
│       ├── entrypoints/   → background, side panel, content scripts (auth-bridge)
│       └── .output/       → Salida del build
│
├── mobile/                → App móvil (Expo SDK 58 + Expo Router)
│   └── src/               → app/ (rutas), components/, lib/, theme/
│
├── backend/               → API (Node.js + Express)
│   ├── src/
│   │   ├── auth/          → Firebase Admin + middlewares requireAuth / attachUserIfPresent
│   │   ├── db/            → pool, repositorios, schema.sql
│   │   ├── gemini/        → cliente de Gemini, lectura de capturas (readCapture.ts)
│   │   ├── routes/        → endpoints de la API
│   │   ├── scraper/       → Cheerio + Puppeteer
│   │   └── utils/         → sanitización, rate limit, logs
│   ├── migrate*.ts        → migraciones de la base
│   └── Dockerfile
│
├── docker-compose.yml     → Stack de producción (postgres + web + backend)
├── Dockerfile             → Imagen de la web
├── docs/                  → Documentación técnica, negocio y decisiones
├── design/                → Wireframes, mockups y Design System V1
├── assets/                → Logos e imágenes
└── README.md
```

La app móvil vive aparte, en `mobile/`: adentro de `apps/`, Metro (Expo) y Next se pelean
por el mismo `node_modules` y el mismo `tsconfig`.

**Las tres superficies pegan contra el mismo backend y el mismo proyecto de Firebase**,
así que una sola cuenta sirve para todas y el historial es uno solo. La extensión no
tiene login propio: toma la sesión de la web (`lib/extension-bridge.ts`), así que para
usarla hay que iniciar sesión en `aletheiainc.online`.

---

## API

Todas las rutas requieren `Authorization: Bearer <Firebase ID token>`, salvo las marcadas.
En producción se llega a ellas con el prefijo `/api` (Traefik lo saca antes de pasarle la
request al backend).

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/analyze` | Analiza un enlace (scraping + Gemini). Rate limit por usuario |
| `POST` | `/analyze/content` | Analiza un texto, una pregunta o lo leído de una captura |
| `POST` | `/analyze/read` | Lee una captura de pantalla (imagen en base64, hasta 3 MB). No se guarda |
| `GET` | `/analyses/:id` | Un análisis. **Auth opcional**: sin sesión, solo los públicos (enlace compartido) |
| `DELETE` | `/analyses/:id` | Borra un análisis propio |
| `GET` / `DELETE` | `/history` | Historial del usuario (paginado con `?limit` y `?offset`) / borrarlo |
| `GET` / `POST` / `DELETE` | `/me` | Perfil del usuario (nombre completo) / borrar la cuenta |
| `GET` | `/stats` | Totales globales de la plataforma. **Sin auth** |

---

## Cómo correr el proyecto en local

### Requisitos
- Node.js 24 (el backend usa TypeScript 7; no usar `ts-node`)
- PostgreSQL local
- Una API key de Gemini y un proyecto de Firebase

### Backend

```bash
cd backend
npm install
cp .env.example .env   # completar GEMINI_API_KEY, FIREBASE_PROJECT_ID, DATABASE_URL
npm run dev            # API en http://localhost:4000
```

La base se crea corriendo `backend/src/db/schema.sql` (por ejemplo desde pgAdmin) y
después las migraciones con `npx tsx migrate.ts` (y el resto de los `migrate-*.ts`).

En local, `CORS_ORIGIN` puede quedar vacía: por defecto acepta `http://localhost:3000`.

### Web

```bash
cd apps
npm install
npm run dev            # http://localhost:3000
```

Variables en `apps/.env.local`: `NEXT_PUBLIC_API_URL` (URL del backend) y las
credenciales de Firebase (`NEXT_PUBLIC_FIREBASE_*`).

### Extensión de Chrome

```bash
cd apps/extension
npm install
npm run dev            # WXT con hot-reload en .output/chrome-mv3-dev (puerto 3300)
```

Cargarla como "unpacked" en `chrome://extensions` apuntando a esa carpeta. Si se toca
`entrypoints/background.ts`, hay que recargar la extensión a mano. Para generar el zip de
la Web Store: `npm run zip`.

### App móvil

```bash
cd mobile
npm install
npm start              # servidor de Expo
```

La app deduce la IP del backend del host de Metro: alcanza con que el teléfono y la PC
estén en la misma red y escanear el QR con **Expo Go**. Detalle en
[`mobile/README.md`](mobile/README.md).

---

## Deploy en producción

El server corre un stack de Docker Swarm con tres servicios (`postgres`, `web`,
`backend`) detrás de Traefik, que ya existe en el VPS (red externa `Kobacnet`).

### 1. Construir las imágenes (en el server, después de cada `git pull`)

```bash
# Web: las NEXT_PUBLIC_* se fijan en el build, no alcanza con pasarlas al contenedor
docker build \
  --build-arg NEXT_PUBLIC_API_URL="https://aletheiainc.online/api" \
  --build-arg NEXT_PUBLIC_FIREBASE_API_KEY="..." \
  --build-arg NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="..." \
  --build-arg NEXT_PUBLIC_FIREBASE_PROJECT_ID="..." \
  --build-arg NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="..." \
  --build-arg NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="..." \
  --build-arg NEXT_PUBLIC_FIREBASE_APP_ID="..." \
  -t boreal_web:latest .

# Backend
docker build -t boreal_backend:latest ./backend
```

Swarm ignora el `build:` del compose: si no se reconstruye la imagen, el stack sigue
corriendo la versión anterior.

### 2. Variables de entorno del stack

Se cargan en Portainer (o se exportan antes de `docker stack deploy`, que no lee el
`.env` solo). Referencia completa en [`.env.example`](.env.example).

| Variable | Uso |
|---|---|
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | Credenciales del servicio `postgres`. Solo se aplican la primera vez que se crea el volumen `pgdata` |
| `DATABASE_URL` | Conexión del backend. El host es el nombre del servicio (`postgres`), no `localhost` |
| `CORS_ORIGIN` | Orígenes del front que pueden llamar a la API, separados por coma y **sin ruta** (ej. `https://aletheiainc.online,https://www.aletheiainc.online`) |
| `FIREBASE_PROJECT_ID` | Verificación de tokens. Sin esto, todas las rutas responden 401 |
| `GEMINI_API_KEY` | API de Gemini |
| `GEMINI_READ_MODEL` | Opcional. Si queda vacía se usa `gemini-2.5-flash` |
| `NEXT_PUBLIC_*` | Las mismas que los build args de la web |

### 3. Base de datos nueva

El servicio `postgres` arranca vacío. La primera vez hay que crear las tablas:

```bash
docker exec -i $(docker ps -qf name=aletheia_postgres) psql -U <usuario> -d <base> < backend/src/db/schema.sql
```

### 4. Desplegar

Redeploy del stack desde Portainer. Para verificar que el backend responde:
`curl https://aletheiainc.online/api/` → `{"status":"ok","service":"aletheIA-backend"}`.

---

## Estado técnico actual

_Última actualización: 4 de noviembre de 2026._

- ✅ **En producción** en [aletheiainc.online](https://aletheiainc.online): VPS con Docker
  Swarm, Traefik y HTTPS con Let's Encrypt.
- ✅ **Web (Next.js):** home, login/registro, dashboard, historial, configuración, perfil
  y páginas legales. Verificación por **enlace, texto, pregunta o captura de pantalla**
  (con recorte y revisión de lo leído antes de verificar). Español e inglés, modo claro y
  oscuro. Diseño sobre el **Design System V1** (paleta Noche/Violeta Aurora, Archivo +
  IBM Plex).
- ✅ **Extensión de Chrome:** publicada en la
  [Chrome Web Store](https://chromewebstore.google.com/detail/djnafnjbmkdkmigadknjhbckdhklhoeh).
  Side panel que analiza la página activa, menú de clic derecho sobre imágenes o texto, y
  captura de redes sociales (Facebook, Instagram, X, WhatsApp Web, TikTok). Toma la sesión
  de la web.
- ✅ **Compartir resultado:** cada análisis guardado tiene una página pública en
  `/resultado/:id`, con preview real (Open Graph / Twitter Card) al compartirlo.
- ✅ **Backend:** Gemini con grounding, scraping con Cheerio + Puppeteer, caché por URL,
  rate limit por usuario y seguridad (SSRF, sanitización, Row Level Security).
- ✅ **App móvil (Expo SDK 58):** login, verificación por enlace, texto o captura,
  resultado, historial y perfil. Misma cuenta y mismo historial que la web.

### Cambios recientes (noviembre 2026)

- `CORS_ORIGIN` ahora se configura desde las variables del stack (antes estaba fija en
  el `docker-compose.yml`).
- La lectura de capturas ya no falla con "model is required" si `GEMINI_READ_MODEL`
  queda vacía: usa el modelo por defecto.
- La sección de la extensión en la home linkea a la Chrome Web Store, y "Crear cuenta y
  empezar" lleva a la Store después del registro. El dashboard tiene un bloque para
  instalar la extensión.
- Botón "Volver al inicio" en login y registro.
- Fondo animado más liviano en celulares: Safari en iPhone cerraba la pestaña por
  memoria ("Ocurrió un problema repetidamente").

### Pendiente

- ⬜ Compilar la app móvil con EAS para probarla en un teléfono, y que reciba el
  "Compartir" de otras apps (intent `ACTION_SEND`).

---

## Integrantes y roles

| Nombre | Rol | Responsabilidades |
|---|---|---|
| **Ciro Di Marsico** | Backend Lead / Scrum Master | API REST, scraping, integración con Gemini, base de datos, infraestructura y deploy |
| **Renzo Lanata** | Frontend Lead | Web (Next.js), extensión Chrome, app móvil (Expo), diseño de interfaz |

---

## Empresa

<div align="center">

**Boreal Data**

</div>
