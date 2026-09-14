# Contexto del Proyecto — AletheIA / Boreal Data

> Documento de continuidad. Se actualiza a medida que avanza el proyecto para no perder contexto entre sesiones.

**Última actualización:** 14 de septiembre de 2026

---

## 1. Información General

| Campo | Detalle |
|---|---|
| Empresa | Boreal Data |
| Producto | AletheIA |
| Concepto | Detector de noticias falsas con IA, verificación de fuentes y análisis de contenido |
| Formatos | Web + Extensión de Chrome (Mobile en Expo, aún sin desarrollo real) |
| Contexto | Proyecto Final de Secundaria (FAT 2026) — presentación diciembre 2026 |
| Equipo | 2 integrantes — **Renzo Lanata** (frontend/diseño) y **Ciro Di Marsico** (backend/scraping/IA/infra) |
| Materia | FAT 7C 2026 — Profesora: Tamara Piccinni |
| Repositorio | github.com/Code7C26/BorealData |
| Rama de Renzo | `rama-RenzoLanata` |

---

## 2. Stack Tecnológico

### Frontend

| Plataforma | Tecnología |
|---|---|
| Web | Next.js (TypeScript), App Router |
| Extensión Chrome | WXT + Manifest V3 + React (side panel, no popup) |
| Mobile | Expo (TypeScript) — pendiente, sin avances reales todavía |
| Hosting | Firebase Hosting |
| Auth | Firebase Auth (Google) + JWT hacia el backend |

### Backend

| Componente | Tecnología |
|---|---|
| API REST | Cloud Run — Node.js + Express (TypeScript) |
| Scraper | Cheerio (estático) → Puppeteer (con JS) |
| Motor IA | Gemini API (Vertex AI, con grounding vía Google Search) |
| Base de datos | Cloud SQL — PostgreSQL |
| Seguridad DB | Row Level Security (rol `aletheia_app` sin privilegios de owner, policies por usuario) |

---

## 3. Estructura del Repositorio (real, verificada)

```
BorealData/
│
├── apps/                     → Next.js (TypeScript), corre desde acá (no "apps/web/")
│   ├── app/
│   │   ├── (autenticado)/    → dashboard, historial, analizando, resultado, perfil, configuracion, contacto
│   │   ├── login/, registro/
│   │   └── resultado/[id]/   → vista pública de un análisis compartido
│   ├── components/           → navbar, sidebar, hero, aurora, faq, quiz-deteccion, quienes-somos, etc.
│   ├── lib/                  → api.ts, auth-context.tsx, firebase.ts, verdict.ts, theme.ts, extension-bridge.ts
│   ├── entrypoints/          → entrypoints de la extensión (WXT)
│   ├── extension/            → build/salida de la extensión (.output/)
│   └── public/
│
├── backend/
│   └── src/
│       ├── auth/, db/, gemini/, routes/, scraper/, utils/
│   (+ migrate.ts, migrate-rls.ts, verify-rls.ts en la raíz de backend/)
│
├── design/            → DESIGN_SYSTEM.md, wireframes
├── docs/ (= DOCS/)    → PDFs de identidad, brainstorms, FODA, stack tecnológico
└── assets/
```

La extensión y la web comparten el mismo `apps/` (no está separada en `apps/web` y `apps/extension` como carpetas independientes de código; `apps/extension/` es la carpeta de salida del build de WXT).

---

## 4. Identidad Visual — Design System V1 (rediseño de cero, 11-sep-2026)

El 11 de septiembre de 2026 se rediseñó **todo** el frontend contra dos PDFs de Renzo: *"AletheIA Identidad"* (marca V1) y *"AletheIA Sistema"* (design system V1.0). No fue un retoque — cambió el contrato del análisis, la paleta, la tipografía y todas las pantallas. **Esto reemplaza la paleta navy/blue que se había usado hasta esa fecha.**

### Paleta actual
| Nombre | Uso |
|---|---|
| Noche `#0B100F` | Fondo |
| Violeta Aurora `#7A5AF8` / `#B9A4FF` | Acento principal |
| Luz Boreal `#F2E8D5` | Acento cálido |

- Tokens en `apps/app/global.css`, en dos capas (paleta cruda + roles semánticos). Ningún componente usa un hex suelto.
- Tipografía: **Archivo** (titulares) + **IBM Plex Sans/Mono**, base 1rem = 17px.
- Modo claro obligatorio, controlado con `data-theme` en `<html>` (`apps/lib/theme.ts`).

### Preferencia de diseño de Renzo (sigue vigente)
Pide que el diseño "se la juegue": glows marcados, gradientes, movimiento — lo prolijo-pero-sutil para él equivale a "no cambió nada". El fondo se anima **siempre**, incluso con "reducir movimiento" activado en el sistema (decisión suya, documentada en un comentario en `global.css`, no es un descuido de accesibilidad). El sidebar tiene que tener vida propia pero sin igualarse al área de contenido.

### Gotchas de Tailwind v4 (el sistema venía pensado para v3)
- `--spacing-*` y `--container-*` comparten namespace: tener `--spacing-card: 32px` hacía que `max-w-card` resolviera a 32px en vez de 720.
- `max-w-prose` es una utilidad con valor propio, no se puede pisar desde el tema.
- `@apply` solo acepta utilidades, no otras clases de componente propias.
- Tailwind v4 no genera clases armadas en runtime (`.replace('border-t-','border-l-')` nunca produce la clase real — hay que escribirlas enteras en `lib/verdict.ts`).

---

## 5. Cambio de contrato del análisis: veredictos + confianza

Se eliminó el **score 0-100**. Ahora el análisis devuelve:
- **4 veredictos:** `verificado` / `dudoso` / `falso` / `sin-datos`
- **5 niveles de confianza:** 1 a 5 (por separado — el veredicto habla de la nota, la confianza de qué tan sólida es la evidencia)

Regla dura: `sin-datos` nunca pasa de 2, y `falso`/`verificado` nunca bajan de 3. Una combinación fuera de tabla degrada a `sin-datos` (`normalizeVerdict` en el backend, `normalize` en `apps/lib/verdict.ts`, más una CHECK constraint en la DB).

- Vocabulario del front: `apps/lib/verdict.ts` (espejo de `backend/src/gemini/types.ts`).
- Card de resultado y sus 5 estados: `apps/components/result/` (o equivalente en `resultado/page.tsx`).
- Migración de DB (`backend/src/db/schema.sql`, columnas `verdict`, `confidence`, `headline`, `lead_text`, `reasoning`) — **ya corrida** sobre el Postgres local de Renzo (14 filas viejas intactas, se traducen al leerlas en `analysesRepository.ts::mapAnalysisRow`).

---

## 6. Extensión de Chrome: de popup a side panel

La extensión dejó de ser un popup y ahora es un **side panel** (`chrome.sidePanel`), como la de Claude: se ancla a la derecha y no se cierra al perder foco. Entrypoint de WXT: `entrypoints/sidepanel/` (antes `entrypoints/popup/`).

**Gotcha importante:** `chrome.sidePanel.close()` llamado desde el propio panel no cierra nada (resuelve la promesa pero no hace nada visible). La forma que funciona es llamarlo **desde el background script** (`entrypoints/background.ts`), escuchando un evento como `tabs.onActivated` — `close()`, a diferencia de `open()`, no requiere gesto directo del usuario.

**Pendiente:** el botón "Ver análisis completo" abre `/historial` (el listado), no el análisis puntual, porque hasta hace poco no existía una ruta pública por id. Ya existe `apps/app/resultado/[id]/` para esto — falta confirmar que la extensión ya apunte ahí.

---

## 7. Seguridad del backend (hardening, 13-sep-2026)

Se hizo una pasada de seguridad completa sobre el backend:
- **SSRF:** `POST /analyze` valida la URL (protocolo, IPs privadas/internas, resolución DNS incluyendo rebinding) antes de scrapear (`backend/src/utils/validateUrl.ts`).
- Límites de longitud en `url` (`/analyze`) y `fullName` (`/me`).
- Sanitización de caracteres de control en `fullName`, `url` y en el texto/título scrapeado (`backend/src/utils/sanitize.ts`).
- **Rate limit:** 20 análisis nuevos por hora por usuario en `/analyze` (no cuenta cache hits), en memoria, sin dependencias nuevas (`backend/src/utils/rateLimiter.ts`).
- **Row Level Security en Postgres:** rol de aplicación `aletheia_app` sin privilegios de owner, policies para que cada usuario solo acceda a sus propias filas (`users`/`analyses`), con excepciones explícitas para compartir resultado, la caché de análisis por URL y el agregado público de `/stats`. Scripts: `backend/migrate-rls.ts` / `backend/verify-rls.ts`.
- `apps/extension/.gitignore` ahora excluye `.env*` (antes faltaba, a diferencia de `apps/` y `backend/`).

---

## 8. Estado actual del frontend web

### Pantallas desarrolladas
- ✅ Home (`app/page.tsx`) — navbar, hero, input URL/texto, stats bar, quiz de detección, FAQ, footer
- ✅ Login / Registro (`app/login`, `app/registro`)
- ✅ Dashboard, Historial, Analizando, Resultado, Perfil, Configuración, Contacto — todo bajo `app/(autenticado)/`
- ✅ Resultado compartido por id (`app/resultado/[id]/`)

### Bugs resueltos recientes (bitácora completa en memoria de sesión, no repetir diagnóstico)
- Botón "Compartir resultado" ahora da feedback visual ("¡Enlace copiado!"), con manejo de error si `navigator.clipboard` no existe.
- Botón "Volver al historial" ahora es sticky en la vista de resultado — arreglado un bug real de `overflow-hidden` en el div raíz de `components/sidebar.tsx` que rompía `position: sticky` (y podía romper `fixed`) en cualquier página autenticada. Se sacó el `overflow-hidden` a un wrapper propio, más chico, solo para las capas decorativas.
- Vista de error del resultado ya no muestra el botón de compartir (no aplica).
- Historial y link de compartir rotos → causa raíz era que faltaba correr la migración de DB (columnas nuevas de veredicto/confianza). Ahora hay `backend/migrate.ts`, idempotente.
- El borrador de `sessionStorage` del análisis anterior ya no queda pegado al volver a analizar (`limpiarBorrador()`).
- Íconos de la app regenerados desde la geometría del isotipo "Umbral" con Pillow.
- **Bug de sesión al usar la extensión (resuelto):** el login usaba persistencia por pestaña (`browserSessionPersistence`) por defecto, y una pestaña nueva sin sesión disparaba un logout que además le borraba la sesión a la extensión. Fix en el checkbox de "recordarme" (default `true`) y en `extension-bridge.ts` (solo desloguea la extensión ante una transición real usuario→null).
- Filas viejas de análisis perdían el razonamiento por un `DEFAULT '[]'` mal puesto en la migración; y `averageConfidence` daba 0 por no contemplar filas viejas sin `confidence` — ambos corregidos.

### Bug de backend pendiente de decisión (no de frontend)
Solo la primera fuente de cada análisis es clickeable: Gemini devuelve `sources[].title` sin URL real, y el sistema intenta cruzarla contra `groundingChunks` por texto — ese cruce casi nunca encuentra match salvo en el índice 0. Medido contra la DB real: de 8 análisis, solo 2 tuvieron alguna fuente con url, y en ambos casos únicamente la primera. El frontend ya renderiza bien (link si hay `url`, texto plano si no). Falta que Renzo decida: mejorar el matching, reconstruir la lista solo con fuentes que sí tengan link real (bajaría mucho la cantidad mostrada), o dejarlo para un chat de backend dedicado.

---

## 9. Flujo de trabajo Git

```bash
# Subir cambios
git add .
git commit -m "tipo(scope): descripción #NúmeroIssue"
git push origin rama-RenzoLanata
```

| Tipo | Uso |
|---|---|
| feat | Nueva funcionalidad |
| fix | Corrección de error |
| design | Cambios de diseño/UI |
| docs | Documentación |
| style | Formato, espacios |
| refactor | Reestructuración |

### Cómo correr el proyecto localmente
```bash
cd C:\Users\Usuario\BorealData\apps
npm run dev
# Abre en http://localhost:3000
```
La extensión corre con `npm run dev` (WXT) desde la misma carpeta y se carga "unpacked" en `chrome://extensions` desde `apps/extension/.output/chrome-mv3-dev`. Tiene hot-reload, salvo `background.ts`, que requiere recargar la extensión a mano.

---

## 10. Análisis de Competencia

- **NewsGuard** — Pago, calificación humana, sin análisis de texto con IA
- **Ground News** — Freemium, sin IA, centrado en EE. UU.
- **InVID / WeVerify** — Gratuito, solo extensión, orientado a periodistas
- **Our.News** — Gratuito, crowdsourcing, susceptible a manipulación
- **Logically** — Más similar a AletheIA, pero abandonó al usuario final en 2025
- **Google Fact Check Explorer** — Gratuito, solo busca claims ya verificados

**Diferenciadores de AletheIA:** enfoque Latam/español primero, IA como núcleo (no complemento), análisis transparente (muestra el razonamiento, no solo el veredicto), MVP 100% gratuito.

---

## 11. Documentos generados

| Documento | Descripción |
|---|---|
| `docs/Analisis_Competencia_AletheIA.pdf` | Tabla comparativa de competidores |
| `docs/BRAINSTORM_empresa.pdf` / `BRAINSTORM_producto.pdf` | Brainstorms iniciales |
| `docs/FODA.png` | FODA del equipo |
| `docs/MVP-BorealData.pdf` | Definición del MVP |
| `docs/TECHNOLOGICAL_STACK.pdf` | Stack tecnológico |
| `docs/validacion y empatia.pdf` | Mapa de empatía del usuario |
| `docs/reporte-cierre-mes-aletheia.pdf` | Reporte de cierre de mes |
| `design/DESIGN_SYSTEM.md` | Design System V1 en código |

---

## 12. Pendientes inmediatos

- [ ] Decidir cómo resolver el bug de fuentes no clickeables (backend/Gemini) — ver sección 8.
- [ ] Confirmar que el botón "Ver análisis completo" de la extensión ya apunte a `resultado/[id]` en vez de a `/historial`.
- [ ] Evaluar si "compartir resultado" necesita un endpoint público real (hoy el link solo sirve si el análisis está en `sessionStorage` del mismo navegador/pestaña, salvo que ya se haya resuelto vía `resultado/[id]`).
- [ ] Mobile (Expo) sigue sin desarrollo real — última prioridad.
- [ ] Seguir la bitácora de bugs de frontend a medida que Renzo reporte nuevos.

---

*Documento generado como contexto de continuidad del Proyecto FAT 2026 — Boreal Data.*
