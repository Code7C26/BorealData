<div align="center">
<img src="./assets/logo aletheIA.png" />
# aletheIA
### Detector inteligente de fake news

*Boreal Data — 2026*

</div>

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
tiempo real y devuelve un porcentaje de veracidad junto con una explicación clara y
fundamentada. El usuario puede enviar un link desde la web o el celular, o simplemente
activar la extensión de Chrome mientras navega para analizar la página que está viendo
en ese momento.

El análisis combina extracción automática del contenido (scraping) con un modelo de
inteligencia artificial (Gemini API) que evalúa el texto, identifica señales de alarma
y clasifica la información en una escala de 0 a 100%.

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
│   ├── web/          → Frontend Next.js (TypeScript)
│   ├── extension/    → Extensión Chrome (Manifest V3 + React)
│   └── mobile/       → App móvil (Expo)
│
├── backend/          → API REST (Node.js + Express + Cloud Run)
│
├── docs/             → Documentación técnica y decisiones de arquitectura
│
├── design/           → Wireframes, mockups y guía de estilos
│
├── assets/           → Imágenes, íconos y recursos gráficos del proyecto
│
└── README.md
```

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
*Tecnología con propósito*

</div>