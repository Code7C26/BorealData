# AletheIA — Sistema de Diseño (V1)

> Vigente desde el 11 de septiembre de 2026 (rediseño de cero contra los PDFs
> *"AletheIA Identidad"* y *"AletheIA Sistema"*). Reemplaza por completo la
> versión anterior de este documento (paleta navy/blue, fondo oscuro
> obligatorio).

## 1. Identidad visual

AletheIA usa una identidad visual con **impacto**, no minimalista: glows
marcados, gradientes y movimiento constante en el fondo. Lo "prolijo pero
sutil" no transmite que el producto cambió — la marca busca llamar la
atención sin dejar de comunicar precisión y transparencia.

**Modo claro obligatorio.** El tema se controla con el atributo `data-theme`
en `<html>` (`apps/lib/theme.ts`).

---

## 2. Paleta de colores

| Nombre | Valor | Uso |
|---|---|---|
| Noche | `#0B100F` | Fondo (elementos oscuros, texto sobre claro) |
| Violeta Aurora | `#7A5AF8` | Acento principal — botones, elementos destacados |
| Violeta Aurora claro | `#B9A4FF` | Estados activos, acentos secundarios |
| Luz Boreal | `#F2E8D5` | Acento cálido |

Los tokens viven en `apps/app/global.css`, en dos capas: paleta cruda (los
valores de arriba) y roles semánticos (lo que efectivamente usa cada
componente). **Ningún componente debe usar un hex hardcodeado** — todo pasa
por los roles semánticos.

Esta paleta **reemplaza** a la navy/blue (`#0B1B2B` / `#1A6DB5`) que se usó
hasta el 10-sep-2026.

### Fondo animado

El fondo se anima **siempre**, incluso con "reducir movimiento" activado en
el sistema operativo. Es una decisión de producto, no un descuido de
accesibilidad — está documentada en un comentario en `global.css`. El
movimiento es lento y difuminado, no desplaza contenido.

---

## 3. Tipografía

- **Titulares:** Archivo
- **Cuerpo / UI:** IBM Plex Sans
- **Código / datos:** IBM Plex Mono
- **Base:** `1rem = 17px`

La jerarquía tipográfica debe mantenerse consistente en todas las pantallas.

---

## 4. Componentes

### Botones

- Gradiente sobre Violeta Aurora, no un color plano.
- Texto en Luz Boreal o Noche según contraste.
- Bordes redondeados, glow visible en hover/focus (no un cambio sutil de
  tono).

### Inputs

- Bordes sutiles, `focus` destacado con Violeta Aurora claro.
- Placeholder en tono secundario (rol semántico "muted", no un gris
  arbitrario).

### Cards de resultado

Viven en `apps/components/result/` (o equivalente en `resultado/page.tsx`) y
tienen **5 estados visuales**, uno por combinación de veredicto:
`verificado`, `dudoso`, `falso`, `sin-datos`, y el estado de error. Cada
veredicto tiene su propia clase de acento — las clases van escritas
completas en `apps/lib/verdict.ts` (Tailwind v4 no arma clases en runtime
concatenando strings, ver gotchas abajo).

### Sidebar

Tiene que tener vida propia (glows, textura) pero **sin** igualarse
visualmente al área de contenido — tiene que seguir distinguiéndose como
navegación.

### Tabs

Cambian entre modos de entrada (URL / Texto). El seleccionado se distingue
con el acento Violeta Aurora.

---

## 5. Veredictos y confianza (contrato de datos, no solo visual)

Desde el rediseño V1 no existe más un score 0-100. El análisis devuelve dos
cosas separadas:

- **Veredicto** (la conclusión): `verificado` / `dudoso` / `falso` /
  `sin-datos`.
- **Confianza** (qué tan sólida es la evidencia): 1 a 5.

Regla dura que también es una regla de diseño (no combinar visualmente algo
fuera de tabla): `sin-datos` nunca va con confianza > 2; `falso` y
`verificado` nunca van con confianza < 3. Fuente de verdad en código:
`apps/lib/verdict.ts` (espejo de `backend/src/gemini/types.ts`).

---

## 6. Estados interactivos

- **Normal:** estado predeterminado.
- **Hover:** glow o gradiente más marcado, no un cambio sutil.
- **Focus:** anillo en Violeta Aurora claro, siempre visible (accesibilidad).
- **Active:** feedback inmediato, sin transición larga.
- **Disabled:** desaturado, sin glow.

---

## 7. Espaciado y formas

Bordes redondeados en los componentes principales. Evitar saturación visual
pese a la intensidad de color — el impacto viene de los acentos (glows,
gradientes, movimiento), no de amontonar elementos.

**Gotcha de Tailwind v4** (el sistema se escribió pensando en v3 con
`tailwind.config.ts`, y esto rompió builds más de una vez):
- `--spacing-*` y `--container-*` comparten namespace: definir
  `--spacing-card: 32px` hace que `max-w-card` resuelva a **32px** en vez de
  720px.
- `max-w-prose` es una utilidad con valor propio del framework — no se puede
  pisar desde el tema.
- `@apply` solo acepta utilidades de Tailwind, no otras clases de componente
  propias (`.btn-primary { @apply btn }` rompe la compilación completa del
  CSS).
- No genera clases armadas en runtime: `algo.replace('border-t-','border-l-')`
  nunca produce una clase real (`border-l-verdict-*`) aunque el string
  resultante exista — hay que escribir cada clase completa en el código
  fuente (`apps/lib/verdict.ts`).

---

## 8. Iconografía

Los íconos de la app se regeneraron desde la geometría del isotipo
"Umbral" (Pillow, supersampling x8). A tamaños chicos (≤32px) llevan un
ajuste óptico: el velo que en el isotipo grande mide 8 unidades queda casi
invisible a esa escala, así que se agranda a 10 unidades y el conjunto
completo se escala a 0.94.

---

## 9. Principios de diseño

- Impacto sobre sutileza — "que llame, que atraiga".
- Transparencia: mostrar el razonamiento detrás de un veredicto, no solo el
  resultado.
- Consistencia de tokens: todo pasa por roles semánticos, cero hex sueltos.
- Accesibilidad donde no choca con el punto 1 (el fondo animado es la
  excepción deliberada, ver sección 2).
