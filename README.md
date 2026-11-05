<p align="center">
  <img src="assets/logoAletheia-banner.svg" alt="AletheIA — Boreal Data" width="360" />
</p>

<h1 align="center">AletheIA</h1>

<p align="center">Detector de noticias falsas con inteligencia artificial — Boreal Data, 2026</p>

---

## Descripción

AletheIA analiza noticias, publicaciones y afirmaciones y devuelve un veredicto
fundamentado. El contenido puede ingresarse como enlace, texto, pregunta o captura
de pantalla, desde la web, la extensión de Chrome o la app móvil.

El análisis combina la extracción del contenido (scraping con Cheerio y, como
alternativa, Puppeteer) con Gemini y grounding vía Google Search. El resultado tiene
dos componentes independientes:

- **Veredicto:** `verificado`, `dudoso`, `falso` o `sin-datos`.
- **Confianza:** nivel de 1 a 5 que expresa la solidez de la evidencia.

No se informa un porcentaje de veracidad: una cifra como "72 %" comunicaría una
precisión que el análisis no tiene. Junto al veredicto se muestran el razonamiento,
las fuentes consultadas (con su postura) y el tono del contenido.

### Público objetivo

- Personas que consumen noticias en internet y quieren verificarlas antes de compartirlas.
- Estudiantes y docentes que necesitan validar fuentes.
- Periodistas y comunicadores que requieren una primera validación rápida.

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Web | Next.js 16 (App Router) + React 19 + TypeScript, Tailwind CSS v4 |
| Extensión | WXT + Manifest V3 + React (side panel) |
| App móvil | Expo SDK 58 + React Native 0.88 + Expo Router |
| Backend | Node.js + Express 5 + TypeScript 7 |
| Scraping | Cheerio, con Puppeteer para páginas que requieren JavaScript |
| IA | Gemini API (`@google/genai`) con grounding vía Google Search |
| Base de datos | PostgreSQL con Row Level Security |
| Autenticación | Firebase Authentication; el backend verifica el ID token con Firebase Admin |
| Despliegue | Docker Compose (stack de Docker Swarm) |

---

## Estructura del repositorio

```
BorealData/
├── apps/                 Web (Next.js)
│   ├── app/              Rutas del App Router
│   ├── components/       Componentes de interfaz (result/ contiene la vista de resultado)
│   ├── lib/              Cliente de la API, autenticación, vocabulario de veredictos, idioma, tema
│   ├── public/           Archivos estáticos
│   └── extension/        Extensión de Chrome (paquete npm independiente, ver su README)
├── mobile/               App móvil (Expo), ver mobile/README.md
├── backend/              API REST
│   ├── src/auth/         Verificación del ID token de Firebase
│   ├── src/db/           Pool de Postgres, repositorios y esquema (schema.sql)
│   ├── src/gemini/       Prompt, llamada a Gemini y parseo de la respuesta
│   ├── src/routes/       Endpoints
│   ├── src/scraper/      Extracción de contenido
│   ├── src/utils/        Validación de URLs (SSRF), sanitización, rate limit, logging
│   └── migrate*.ts       Migraciones de base de datos
├── design/               Sistema de diseño (DESIGN_SYSTEM.md)
├── DOCS/                 Documentación del proyecto (arquitectura, viabilidad, entregables)
├── assets/               Recursos gráficos de la marca
├── Dockerfile            Imagen de la web
└── docker-compose.yml    Postgres + web + backend
```

La app móvil vive fuera de `apps/` porque Metro y Next.js no pueden compartir el mismo
`node_modules` ni el mismo `tsconfig`.

Las tres superficies usan el mismo backend y el mismo proyecto de Firebase: una cuenta
sirve para todas y el historial es compartido.

---

## Puesta en marcha

### Requisitos

- Node.js 20 o superior (la imagen del backend usa Node 24).
- PostgreSQL.
- Una API key de Gemini y un proyecto de Firebase.

Cada paquete incluye un `.env.example` con las variables necesarias.

### Backend

```bash
cd backend
npm install
cp .env.example .env
npm run dev          # http://localhost:4000 (puerto definido en .env)
```

El esquema completo está en `backend/src/db/schema.sql`. Las migraciones incrementales
(`migrate*.ts`) se ejecutan con el rol dueño de las tablas; ver
[DOCS/ARQUITECTURA.md](DOCS/ARQUITECTURA.md#base-de-datos).

### Web

```bash
cd apps
npm install
cp .env.example .env.local
npm run dev          # http://localhost:3000
```

### Extensión de Chrome

```bash
cd apps/extension
npm install
cp .env.example .env
npm run dev          # salida en apps/extension/.output/chrome-mv3-dev
```

La carpeta de salida se carga como extensión sin empaquetar en `chrome://extensions`.
Ver [apps/extension/README.md](apps/extension/README.md).

### App móvil

```bash
cd mobile
npm install
cp .env.example .env.local
npm start            # servidor de Expo; se abre con Expo Go escaneando el QR
```

Ver [mobile/README.md](mobile/README.md).

### Despliegue con Docker

```bash
cp .env.example .env
docker compose build
docker stack deploy -c docker-compose.yml aletheia
```

Las variables `NEXT_PUBLIC_*` se incorporan al bundle durante el build de la imagen
web; al modificarlas es necesario reconstruirla.

---

## Calidad

| Paquete | Comandos |
|---|---|
| `apps/` | `npm run lint`, `npm test`, `npx tsc --noEmit` |
| `apps/extension/` | `npm run compile` |
| `backend/` | `npm test`, `npm run build` |
| `mobile/` | `npm run typecheck`, `npm run lint` |

---

## Documentación

- [DOCS/ARQUITECTURA.md](DOCS/ARQUITECTURA.md): arquitectura, contrato del análisis y decisiones técnicas.
- [design/DESIGN_SYSTEM.md](design/DESIGN_SYSTEM.md): sistema de diseño V1.
- [apps/extension/PUBLICAR.md](apps/extension/PUBLICAR.md): publicación en la Chrome Web Store.
- [DOCS/VIABILIDAD_COMERCIAL.md](DOCS/VIABILIDAD_COMERCIAL.md): costos y viabilidad comercial.

---

## Equipo

| Integrante | Rol |
|---|---|
| Ciro Di Marsico | Backend: API REST, scraping, integración con Gemini, base de datos, infraestructura |
| Renzo Lanata | Frontend: web, extensión de Chrome, app móvil, diseño de interfaz |
