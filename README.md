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

**aletheIA** es un sistema multiplataforma que analiza noticias y publicaciones web en
tiempo real y devuelve un veredicto claro junto con una explicación fundamentada. El
usuario puede enviar un link o texto desde la web, o simplemente activar la extensión
de Chrome mientras navega para analizar la página que está viendo en ese momento.

El análisis combina extracción automática del contenido (scraping) con un modelo de
inteligencia artificial (Gemini API, con grounding vía Google Search) que evalúa el
texto, cruza fuentes reales y devuelve **uno de 4 veredictos** (`verificado`, `dudoso`,
`falso`, `sin-datos`) junto con **un nivel de confianza de 1 a 5** — dos cosas
separadas: el veredicto es la conclusión, la confianza dice qué tan sólida es la
evidencia detrás. No hay un porcentaje de veracidad: un "72%" comunicaría una
precisión decimal que el análisis no tiene.

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

### Software

| Capa | Tecnología | Descripción |
|---|---|---|
| Web | Next.js + TypeScript | Frontend web con SSR |
| Extensión | Manifest V3 + React | Extensión para Chrome |
| Mobile | Expo (React Native) | App iOS y Android |
| Hosting | Firebase Hosting | Deploy web con CDN global |
| Backend | Node.js + Express | API REST en Cloud Run |
| Scraping | Cheerio + Puppeteer | Extracción de contenido web |
| IA | Gemini API | Análisis de veracidad |
| Base de datos | Cloud SQL (PostgreSQL) | Historial de análisis |
| Autenticación | Firebase Auth + JWT | Login con Google |
| Infraestructura | Google Cloud Platform | Plataforma cloud unificada |

---

## Estructura del repositorio

```
aletheIA/
│
├── apps/
│   ├── app/            → Rutas de Next.js (App Router): home, login, historial,
│   │                      dashboard, resultado (privado y público /resultado/:id)
│   ├── components/      → Componentes de la web (navbar, sidebar, result/, etc.)
│   ├── lib/              → api.ts, auth-context.tsx, verdict.ts, theme.ts
│   ├── entrypoints/      → Entrypoints de la extensión de Chrome (WXT)
│   └── extension/        → Salida del build de la extensión (.output/)
│
├── backend/
│   └── src/
│       ├── auth/, db/, gemini/, routes/, scraper/, utils/
│
├── docs/             → Documentación técnica y decisiones de arquitectura
│
├── design/           → Wireframes, mockups y guía de estilos (Design System V1)
│
├── assets/           → Imágenes, íconos y recursos gráficos del proyecto
│
└── README.md
```

La web y la extensión de Chrome comparten el mismo `apps/` (WXT genera la extensión a
partir de `entrypoints/`); Mobile (Expo) todavía no tiene código, es la última
prioridad del roadmap.

---

## Cómo correr el proyecto

### Requisitos
- Node.js 20+
- PostgreSQL local (o acceso a la instancia de Cloud SQL)
- Una API key de Gemini y un proyecto de Firebase configurados en las variables de entorno

### Backend

```bash
cd backend
npm install
npm run migrate      # aplica el esquema (verdict, confidence, headline, lead, reasoning)
npm run dev          # levanta la API en http://localhost:4000
```

### Web

```bash
cd apps
npm install
npm run dev           # levanta el frontend en http://localhost:3000
```

Variables de entorno mínimas en `apps/.env.local`: `NEXT_PUBLIC_API_URL` (URL del
backend) y las credenciales de Firebase (`NEXT_PUBLIC_FIREBASE_*`).

### Extensión de Chrome

```bash
cd apps
npm run dev           # WXT compila con hot-reload en apps/extension/.output/chrome-mv3-dev
```

Cargarla como "unpacked" en `chrome://extensions` apuntando a esa carpeta de salida.
Si se toca `entrypoints/background.ts`, hay que recargar la extensión a mano (el
service worker no tiene hot-reload).

---

## Estado técnico actual

_Última actualización: 14 de septiembre de 2026._

- ✅ **Web (Next.js):** home, login/registro, dashboard, historial, análisis de una URL o
  texto, y la card de resultado con las 5 pantallas del veredicto. Diseño sobre el
  **Design System V1** (paleta Noche/Violeta Aurora, tipografía Archivo + IBM Plex).
- ✅ **Compartir resultado:** cada análisis guardado tiene una página pública sin login en
  `/resultado/:id` (`GET /analyses/:id`, sin auth). El link ahora también arma una
  preview real (Open Graph / Twitter Card) con el veredicto y el titular al compartirlo
  por WhatsApp o redes.
- ✅ **Extensión de Chrome:** side panel (no popup) que analiza la página activa y linkea
  al resultado público cuando el análisis se guardó correctamente.
- ✅ **Backend:** API REST con Gemini (grounding vía Google Search), scraping con Cheerio
  + Puppeteer, y una pasada de seguridad completa (SSRF, sanitización, rate limit,
  Row Level Security en Postgres).
- ⬜ **Mobile (Expo):** sin desarrollo todavía, última prioridad del roadmap.
- ⬜ **Pendiente conocido:** en algunos análisis, solo la primera fuente listada queda
  clickeable — el motor no siempre logra cruzar el título de la fuente con su URL real.
  Está diagnosticado, no resuelto.

---

## Integrantes y roles

| Nombre | Rol | Responsabilidades |
|---|---|---|
| **Ciro Di Marsico** | Backend Lead / Scrum Master | API REST, scraping, integración con Gemini API, base de datos, infraestructura GCP |
| **Renzo Lanata** | Frontend Lead | Web (Next.js), extensión Chrome, app móvil (Expo), diseño de interfaz |

---

## Empresa

<div align="center">

**Boreal Data**

</div>
