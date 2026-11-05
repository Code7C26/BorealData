<p align="center">
  <img src="assets/logoAletheia-banner.svg" alt="AletheIA — Boreal Data" width="360" />
</p>

<h1 align="center">AletheIA</h1>

<p align="center">Detector de noticias falsas con inteligencia artificial — Boreal Data, 2026</p>

<p align="center">
  <a href="https://aletheiainc.online">aletheiainc.online</a> ·
  <a href="https://chromewebstore.google.com/detail/djnafnjbmkdkmigadknjhbckdhklhoeh">Extensión en la Chrome Web Store</a>
</p>

---

## Descripción

AletheIA analiza noticias, publicaciones y afirmaciones y devuelve un veredicto
fundamentado. El contenido puede ingresarse como enlace, texto, pregunta o captura de
pantalla, desde la web, la extensión de Chrome o la app móvil.

El análisis combina la extracción del contenido (scraping, o lectura de la imagen con IA
cuando es una captura) con Gemini y grounding vía Google Search. El resultado tiene dos
componentes independientes:

- **Veredicto:** `verificado`, `dudoso`, `falso` o `sin-datos`.
- **Confianza:** nivel de 1 a 5 que expresa la solidez de la evidencia.

No se informa un porcentaje de veracidad: una cifra como "72 %" comunicaría una
precisión que el análisis no tiene. Junto al veredicto se muestran el razonamiento, las
fuentes consultadas (con su postura) y el tono del contenido.

### Público objetivo

- Personas que consumen noticias en internet y quieren verificarlas antes de compartirlas.
- Estudiantes y docentes que necesitan validar fuentes.
- Periodistas y comunicadores que requieren una primera validación rápida.

---

## Funcionalidades

- **Web** ([aletheiainc.online](https://aletheiainc.online)): verificación por enlace,
  texto, pregunta o captura (con recorte y revisión de la lectura), historial, perfil,
  configuración y páginas legales. Castellano e inglés, modo claro y oscuro.
- **Resultado compartible:** cada análisis guardado tiene una página pública en
  `/resultado/:id`, con vista previa Open Graph / Twitter Card.
- **Extensión de Chrome** (publicada en la Chrome Web Store): side panel que analiza la
  página activa, menú contextual sobre imágenes o texto y captura de redes sociales
  (Facebook, Instagram, X, WhatsApp Web, TikTok). Usa la sesión iniciada en la web.
- **App móvil:** verificación por enlace, texto, pregunta o captura, historial y perfil.
  Aún no publicada en las tiendas.
- **Backend:** caché por URL e idioma, rate limit por usuario, defensa contra SSRF,
  sanitización y Row Level Security.

---

## Stack tecnológico

### Superficies

| Superficie | Tecnología | Detalle |
|---|---|---|
| Web | Next.js 16 (App Router) + React 19 + TypeScript | Tailwind CSS 4, Base UI, lucide-react. Build `standalone` para Docker |
| Extensión | WXT 0.21 + React 19 (Manifest V3) | Side panel de Chrome |
| App móvil | Expo SDK 58 + React Native 0.88 + Expo Router | iOS y Android |

### Backend y análisis

| Capa | Tecnología | Detalle |
|---|---|---|
| API | Node.js 24 + Express 5 + TypeScript 7 | `tsx` en desarrollo, `tsc` para el build, Vitest para tests |
| Scraping | Cheerio + Puppeteer | Cheerio primero; Puppeteer (Chromium headless) si la página necesita JavaScript |
| IA | Gemini (`@google/genai`) | `gemini-2.5-flash` con grounding vía Google Search; el mismo modelo lee las capturas (configurable con `GEMINI_READ_MODEL`) |
| Base de datos | PostgreSQL (`pg`) | Postgres 15 en Docker en producción y Postgres local en desarrollo, con Row Level Security. Cloud SQL soportado vía connector |
| Autenticación | Firebase Authentication | Google y email/contraseña; el backend verifica el ID token con `firebase-admin` |

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
BorealData/
├── apps/                 Web (Next.js)
│   ├── app/              Rutas del App Router
│   ├── components/       Componentes de interfaz (result/ contiene la vista de resultado)
│   ├── lib/              Cliente de la API, sesión, vocabulario de veredictos, idioma, tema
│   ├── public/           Archivos estáticos
│   └── extension/        Extensión de Chrome (paquete npm independiente)
├── mobile/               App móvil (Expo)
├── backend/              API REST
│   ├── src/auth/         Verificación del ID token (requireAuth, attachUserIfPresent)
│   ├── src/db/           Pool de Postgres, repositorios y esquema (schema.sql)
│   ├── src/gemini/       Prompt, llamada a Gemini, lectura de capturas y parseo
│   ├── src/routes/       Endpoints
│   ├── src/scraper/      Extracción de contenido
│   ├── src/utils/        Validación de URLs (SSRF), sanitización, rate limit, logging
│   └── migrate*.ts       Migraciones de base de datos
├── docs/                 Documentación técnica, de producto y de negocio (índice en docs/README.md)
├── design/               Sistema de diseño (DESIGN_SYSTEM.md)
├── assets/               Recursos gráficos de la marca
├── Dockerfile            Imagen de la web
└── docker-compose.yml    Stack de producción: postgres + web + backend
```

La app móvil vive fuera de `apps/` porque Metro y Next.js no pueden compartir el mismo
`node_modules` ni el mismo `tsconfig`.

Las tres superficies usan el mismo backend y el mismo proyecto de Firebase: una cuenta
sirve para todas y el historial es compartido. La extensión no tiene login propio: toma
la sesión de la web (`apps/lib/extension-bridge.ts`).

---

## API

Todas las rutas requieren `Authorization: Bearer <Firebase ID token>`, salvo las
indicadas. En producción se accede con el prefijo `/api`, que Traefik quita antes de
reenviar la request al backend.

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/analyze` | Analiza un enlace (scraping + Gemini). Rate limit por usuario |
| `POST` | `/analyze/content` | Analiza un texto, una pregunta o lo leído de una captura |
| `POST` | `/analyze/read` | Lee hasta 3 imágenes en base64 (máximo 3 MB). No se guardan |
| `GET` | `/analyses/:id` | Un análisis. Autenticación opcional: sin sesión, solo los de enlaces públicos |
| `DELETE` | `/analyses/:id` | Borra un análisis propio |
| `GET` / `DELETE` | `/history` | Historial del usuario (paginado con `?limit` y `?offset`) / borrado completo |
| `GET` / `POST` / `DELETE` | `/me` | Perfil (nombre completo) / borrado de la cuenta |
| `GET` | `/stats` | Totales globales de la plataforma. Sin autenticación |

---

## Desarrollo local

### Requisitos

- Node.js 24.
- PostgreSQL.
- Una API key de Gemini y un proyecto de Firebase.

Cada paquete incluye un `.env.example` con las variables necesarias.

### Backend

```bash
cd backend
npm install
cp .env.example .env   # GEMINI_API_KEY, FIREBASE_PROJECT_ID, DATABASE_URL
npm run dev            # http://localhost:4000
```

La base se crea ejecutando `backend/src/db/schema.sql`. Las migraciones incrementales
(`migrate*.ts`) se ejecutan con el rol dueño de las tablas; ver
[docs/tecnico/arquitectura.md](docs/tecnico/arquitectura.md#migraciones). Sin
`CORS_ORIGIN`, el backend acepta `http://localhost:3000`.

### Web

```bash
cd apps
npm install
cp .env.example .env.local   # NEXT_PUBLIC_API_URL y NEXT_PUBLIC_FIREBASE_*
npm run dev                  # http://localhost:3000
```

### Extensión de Chrome

```bash
cd apps/extension
npm install
cp .env.example .env
npm run dev            # salida en .output/chrome-mv3-dev
```

La carpeta de salida se carga como extensión sin empaquetar en `chrome://extensions`.
Ver [apps/extension/README.md](apps/extension/README.md) y, para publicar,
[apps/extension/PUBLICAR.md](apps/extension/PUBLICAR.md).

### App móvil

```bash
cd mobile
npm install
cp .env.example .env.local
npm start              # servidor de Expo; se abre con Expo Go escaneando el QR
```

Ver [mobile/README.md](mobile/README.md).

### Calidad

| Paquete | Comandos |
|---|---|
| `apps/` | `npm run lint`, `npm test`, `npx tsc --noEmit` |
| `apps/extension/` | `npm run compile` |
| `backend/` | `npm test`, `npm run build` |
| `mobile/` | `npm run typecheck`, `npm run lint` |

---

## Despliegue en producción

El servidor ejecuta un stack de Docker Swarm con tres servicios (`postgres`, `web`,
`backend`) detrás de Traefik, conectado a la red externa `Kobacnet`.

### 1. Imágenes

Swarm ignora la clave `build:` del compose, por lo que las imágenes se construyen en el
servidor después de cada `git pull`:

```bash
# Web: las NEXT_PUBLIC_* se fijan durante el build
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

### 2. Variables de entorno

Se cargan en Portainer o se exportan antes de `docker stack deploy`, que no lee el `.env`
automáticamente. Referencia completa en [`.env.example`](.env.example).

| Variable | Uso |
|---|---|
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | Credenciales del servicio `postgres`. Solo se aplican al crear el volumen `pgdata` |
| `DATABASE_URL` | Conexión del backend. El host es el nombre del servicio (`postgres`) |
| `CORS_ORIGIN` | Orígenes de la web, separados por coma y sin ruta |
| `FIREBASE_PROJECT_ID` | Verificación de tokens. Sin este valor, las rutas autenticadas responden 401 |
| `GEMINI_API_KEY` | API de Gemini |
| `GEMINI_READ_MODEL` | Opcional. Vacía usa `gemini-2.5-flash` |
| `NEXT_PUBLIC_*` | Los mismos valores que los build args de la web |

### 3. Base de datos

El servicio `postgres` arranca vacío. La primera vez se crean las tablas:

```bash
docker exec -i $(docker ps -qf name=aletheia_postgres) psql -U <usuario> -d <base> < backend/src/db/schema.sql
```

### 4. Despliegue

El stack se redespliega desde Portainer. Comprobación del backend:

```bash
curl https://aletheiainc.online/api/
# {"status":"ok","service":"aletheIA-backend"}
```

---

## Pendiente

- Compilar la app móvil con EAS y publicarla.
- Recibir contenido compartido desde otras apps en el teléfono (intent `ACTION_SEND`).

---

## Documentación

- [docs/README.md](docs/README.md): índice de la documentación.
- [docs/tecnico/arquitectura.md](docs/tecnico/arquitectura.md): arquitectura, contrato del análisis y decisiones técnicas.
- [design/DESIGN_SYSTEM.md](design/DESIGN_SYSTEM.md): sistema de diseño V1.

---

## Equipo

| Integrante | Rol | Responsabilidades |
|---|---|---|
| Ciro Di Marsico | Backend Lead / Scrum Master | API REST, scraping, integración con Gemini, base de datos, infraestructura y despliegue |
| Renzo Lanata | Frontend Lead | Web, extensión de Chrome, app móvil, diseño de interfaz |
