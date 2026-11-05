# Contexto del proyecto — AletheIA / Boreal Data

Visión general del proyecto: información institucional, estado actual, decisiones de
producto y pendientes. El detalle técnico está en
[docs/tecnico/arquitectura.md](docs/tecnico/arquitectura.md) y la puesta en marcha, en el
[README](README.md).

**Última actualización:** 5 de noviembre de 2026.

---

## 1. Información general

| Campo | Detalle |
|---|---|
| Empresa | Boreal Data |
| Producto | AletheIA |
| Concepto | Detector de noticias falsas con IA: veredicto, nivel de confianza, fuentes y razonamiento |
| Superficies | Web, extensión de Chrome y app móvil (iOS y Android) |
| Marco | Proyecto final de secundaria — FAT 7C 2026 |
| Docente | Tamara Piccinni |
| Entregas | MVP: mediados de noviembre de 2026. Presentación final: diciembre de 2026 |
| Equipo | Ciro Di Marsico (backend, IA, infraestructura) y Renzo Lanata (frontend, extensión, app móvil, diseño) |
| Repositorio | [github.com/Code7C26/BorealData](https://github.com/Code7C26/BorealData) |
| Producción | [aletheiainc.online](https://aletheiainc.online) |
| Extensión | [Chrome Web Store](https://chromewebstore.google.com/detail/djnafnjbmkdkmigadknjhbckdhklhoeh) |

---

## 2. Estado actual

| Componente | Estado |
|---|---|
| Web | En producción en `aletheiainc.online`. Verificación por enlace, texto, pregunta o captura; historial, perfil, configuración, páginas legales; castellano e inglés; modo claro y oscuro. |
| Extensión de Chrome | Publicada en la Chrome Web Store. Side panel, menú contextual y captura de redes sociales. Usa la sesión de la web. |
| Backend | En producción detrás de Traefik (`aletheiainc.online/api`). Gemini con grounding, scraping con extracción del cuerpo de la nota, caché por URL e idioma, rate limit y Row Level Security. |
| App móvil | Funcional con Expo Go (enlace, texto, pregunta, captura, historial, perfil). Sin publicar en las tiendas. |
| Base de datos | Postgres 15 en el stack de Docker Swarm. |
| Tests | Vitest: 84 en el backend y 13 en la web. |

---

## 3. Stack

Resumen; la versión detallada está en el [README](README.md#stack-tecnológico).

| Capa | Tecnología |
|---|---|
| Web | Next.js 16 + React 19 + TypeScript + Tailwind CSS 4 |
| Extensión | WXT + Manifest V3 + React (side panel) |
| App móvil | Expo SDK 58 + React Native 0.88 + Expo Router |
| Backend | Node.js 24 + Express 5 + TypeScript 7 |
| IA | Gemini 2.5 Flash con grounding vía Google Search |
| Datos | PostgreSQL con Row Level Security |
| Autenticación | Firebase Authentication |
| Infraestructura | VPS con Docker Swarm, Portainer, Traefik y Let's Encrypt |

---

## 4. Decisiones de producto

### Veredicto y confianza en lugar de porcentaje

El análisis devuelve un veredicto (`verificado`, `dudoso`, `falso`, `sin-datos`) y una
confianza de 1 a 5, como valores separados. Se descartó el puntaje de 0 a 100 porque
comunicaba una precisión que el análisis no tiene. Las combinaciones incoherentes se
degradan a `sin-datos` en el backend, en los clientes y en la base de datos.

### Transparencia

El resultado muestra el razonamiento paso a paso y las fuentes con su postura
(confirma, contradice, sin datos, origen), incluidas las que contradicen el veredicto.
Quien recibe un enlace compartido ve el análisis completo, no solo el veredicto.

### Contenido que el servidor no puede leer

Las publicaciones de redes sociales están detrás de un login. En lugar de acceder con
credenciales ajenas, el cliente envía lo que el usuario ya tiene en pantalla: la captura
se transcribe, el usuario revisa la transcripción y recién entonces se verifica. Las
imágenes no se guardan y los análisis de capturas no se comparten entre usuarios.

### Privacidad

Los análisis se guardan en el historial de cada cuenta. Los de enlaces públicos se
reutilizan entre cuentas como caché. Cada usuario puede borrar análisis individuales, su
historial completo o su cuenta. Las páginas `/privacidad` y `/terminos` describen ese
comportamiento.

### Identidad visual

Design System V1: paleta Noche, Violeta Aurora y Luz Boreal; tipografías Archivo e IBM
Plex. La identidad privilegia el impacto (glows, gradientes, movimiento) sobre la
sutileza, y el fondo se anima siempre, incluso con "reducir movimiento" activado.
Detalle en [design/DESIGN_SYSTEM.md](design/DESIGN_SYSTEM.md).

---

## 5. Competencia

| Servicio | Modelo | Diferencia con AletheIA |
|---|---|---|
| NewsGuard | Pago | Calificación humana de medios, sin análisis de texto con IA |
| Ground News | Freemium | Sin IA, centrado en Estados Unidos |
| InVID / WeVerify | Gratuito | Solo extensión, orientado a periodistas |
| Our.News | Gratuito | Basado en crowdsourcing, susceptible a manipulación |
| Logically | — | El más similar; abandonó al usuario final en 2025 |
| Google Fact Check Explorer | Gratuito | Solo busca afirmaciones ya verificadas |

Diferenciadores: enfoque en Latinoamérica y en castellano, IA como núcleo del producto,
análisis transparente y gratuito para el usuario final.

---

## 6. Flujo de trabajo

- Ramas de trabajo por integrante (`rama-RenzoLanata`, `CIRO`); los cambios entran a
  `main` mediante pull requests.
- Convención de commits: `tipo(alcance): descripción`.

| Tipo | Uso |
|---|---|
| `feat` | Nueva funcionalidad |
| `fix` | Corrección de error |
| `docs` | Documentación |
| `style` | Formato |
| `refactor` | Reestructuración sin cambio de comportamiento |
| `build` | Build, dependencias o empaquetado |

- Antes de abrir un pull request: chequeo de tipos, lint y tests de los paquetes
  modificados (ver la sección "Calidad" del README).

---

## 7. Documentos del proyecto

El índice completo está en [docs/README.md](docs/README.md).

| Documento | Contenido |
|---|---|
| `docs/manual-de-usuario.pdf` | Manual de la web y la extensión |
| `docs/negocio/viabilidad-comercial.md` | Costos, precios y viabilidad comercial |
| `docs/negocio/analisis-de-competencia.pdf` | Comparativa de competidores |
| `docs/producto/mvp.pdf` | Definición del MVP |
| `docs/tecnico/arquitectura.md` | Arquitectura y decisiones técnicas |
| `design/DESIGN_SYSTEM.md` | Sistema de diseño V1 |

---

## 8. Pendientes

- **Migraciones en producción:** confirmar que `migrate-question.ts` está aplicada en la
  base del servidor. Sin ella, los análisis de tipo pregunta se muestran pero no se
  guardan en el historial.
- **App móvil:** compilarla con EAS, publicarla y recibir contenido compartido desde
  otras apps (intent `ACTION_SEND`).
- **Rate limit:** el contador vive en memoria; si el backend pasa a varias instancias,
  debe trasladarse a Postgres.
- **Dependencias:** hay actualizaciones menores y de parche disponibles en los cuatro
  paquetes (`npm outdated`).
