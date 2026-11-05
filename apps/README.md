# AletheIA — Web

Frontend web de AletheIA: Next.js 16 (App Router), React 19, TypeScript y Tailwind CSS v4.

## Desarrollo

```bash
npm install
cp .env.example .env.local
npm run dev          # http://localhost:3000
```

Variables (`.env.example`):

| Variable | Descripción |
|---|---|
| `NEXT_PUBLIC_API_URL` | URL del backend. |
| `NEXT_PUBLIC_FIREBASE_*` | Configuración del SDK web de Firebase. |

Todas las variables `NEXT_PUBLIC_*` se incluyen en el bundle del navegador y no deben
contener secretos.

## Scripts

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo. |
| `npm run build` | Build de producción (`output: "standalone"`). |
| `npm start` | Sirve el build. |
| `npm run lint` | ESLint. |
| `npm test` | Tests con Vitest. |

## Estructura

| Carpeta | Contenido |
|---|---|
| `app/(autenticado)/` | Dashboard, análisis en curso, resultado sin guardar, historial, perfil, configuración. |
| `app/(info)/` | Contacto, privacidad y términos (públicas). |
| `app/resultado/[id]/` | Vista canónica y compartible de un análisis guardado. |
| `app/login/`, `app/registro/` | Autenticación con Firebase. |
| `app/ejemplo/` | Análisis de ejemplo para visitantes sin cuenta. |
| `components/` | Componentes de interfaz; `components/result/` contiene la vista de resultado. |
| `lib/` | Cliente de la API, sesión, vocabulario de veredictos, idioma, tema y puente con la extensión. |
| `extension/` | Extensión de Chrome, con su propio `package.json` (ver `extension/README.md`). |

Los tokens de diseño están en `app/global.css`; ver `design/DESIGN_SYSTEM.md` en la raíz
del repositorio.
