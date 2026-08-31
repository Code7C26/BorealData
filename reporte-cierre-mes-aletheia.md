# aletheIA — Reporte de Cierre de Mes (Agosto 2026)

**Proyecto:** aletheIA — Detector de Fake News · **Empresa:** Boreal Data
**Equipo:** Ciro Di Marsico (Backend Lead / Scrum Master) · Renzo Lanata (Frontend Lead)
**Fecha de corte:** 31/08/2026 · **Próximo hito:** Sprint de Septiembre → MVP en Noviembre

---

## 📊 Porcentaje de Avance

# **60%**

> El motor (scraping + IA + base de datos + autenticación + perfil de usuario) está terminado y probado end-to-end. La Web tiene su base armada y la Extensión Chrome está en desarrollo activo — lo que queda es reforzar el frontend y cablear la conexión real entre back y front.

---

## ✅ Funciones Listas (terminadas y funcionando al 100%)

| Módulo | Función |
|---|---|
| Scraper | Extracción de contenido con Cheerio + fallback automático a Puppeteer en sitios con JS |
| IA (Gemini) | Análisis de veracidad con grounding (Google Search) — score, etiqueta, resumen, comparación afirmación vs. evidencia y fuentes reales |
| Backend | `POST /analyze` — scraping + IA + guardado en base, probado end-to-end |
| Backend | `GET /history` — historial paginado del usuario, probado end-to-end |
| Backend | `GET /me` / `POST /me` — perfil de usuario (nombre y apellido) |
| Autenticación | Firebase Auth integrado (Google + Email/Password), login opcional en `/analyze` y obligatorio en `/history` |
| Base de datos | Postgres local funcionando end-to-end (tablas `analyses` y `users` con relación) |
| Frontend Web | Base del proyecto Next.js armada |

---

## ❌ Funciones Pendientes (falta programar o soldar para el MVP)

| Módulo | Función |
|---|---|
| **Frontend Web** | Reforzar pantallas (ingresar URL, ver resultado, login, historial) |
| **Extensión Chrome** | En desarrollo — completar popup y análisis de página activa |
| **Integración** | Conectar Web y Extensión con el backend real (hoy funcionan por separado) |
| Infra / Deploy | Recrear Cloud SQL en la nube y desplegar a Cloud Run (hoy todo corre local, en la máquina de Ciro) |
| Infra / Deploy | Deploy en Firebase Hosting |
| Bug menor | Resumen en viñetas de sitios tipo Clarín no se extrae bien (no bloqueante) |
| QA | Re-correr los 3 casos de prueba con el contrato nuevo (summary / claimVsEvidence / sources) |

---

**Nota para el sprint de septiembre:** el contrato del backend (`/analyze`, `/history`, `/me`) ya está definido y probado — el foco de septiembre es 100% conexión e integración: reforzar la Web, avanzar la Extensión, y unir todo con el backend real.
