/**
 * AletheIA — Design System V1 portado a React Native.
 *
 * Traducción literal de `apps/app/global.css`. Misma estructura de dos capas:
 * paleta cruda (los hex viven acá una sola vez) y roles semánticos. Ningún
 * componente usa un hex: usa el rol (`c.surface`, `c.textMuted`, `c.border`),
 * así el cambio de modo no toca ni un componente — igual que en la web.
 *
 * En la web los roles son custom properties de CSS y el modo se activa con
 * `data-theme` en <html>. Acá no hay cascada: los roles son dos objetos
 * congelados y el modo lo resuelve `useTheme()` una vez, arriba del árbol.
 */

/* ── Paleta cruda — única fuente de verdad de los hex de la V1 ────────────── */
export const raw = {
  /** Neutros Noche — negros con verde apenas perceptible, 0.01 de croma */
  noche900: '#0B100F',
  noche800: '#141A19',
  noche700: '#1F2726',
  noche600: '#2C3634',
  gris500: '#6F7B79',
  gris400: '#94A3A0',
  gris300: '#A8B3B1',
  bruma100: '#E8ECEA',

  /** Neutros Papel */
  papel50: '#F7F8F6',
  papel100: '#EFF1EE',
  papel200: '#E3E6E1',
  tinta: '#171C1B',

  /** Marca — el violeta viene del fenómeno físico (aurora), no del sector */
  aurora300: '#B9A4FF',
  aurora500: '#7A5AF8',
  aurora700: '#4C2FB8',
  luz: '#F2E8D5',

  /** Veredicto — par oscuro / claro. Nunca un color solo: color + etiqueta */
  verificadoD: '#34C48A',
  verificadoL: '#127A52',
  dudosoD: '#E9A93C',
  dudosoL: '#8A5A00',
  falsoD: '#F0705F',
  falsoL: '#A8331F',
  sindatosD: '#94A3A0',
  sindatosL: '#4A5654',
} as const;

/** Los roles que ven los componentes. Las dos modalidades tienen las mismas claves. */
export interface Roles {
  bg: string;
  surface: string;
  surfaceSunk: string;
  border: string;
  borderStrong: string;

  text: string;
  textMuted: string;
  textSubtle: string;
  textDisabled: string;
  /** Titulares: Luz Boreal en dark, Tinta en light. */
  display: string;

  /** Solo superficies y bordes — no alcanza el contraste para texto. */
  accent: string;
  /** Texto y enlaces. */
  accentText: string;
  /** Fondo del botón primario. */
  accentSolid: string;
  /** Texto sobre `accentSolid`. */
  accentInk: string;
  ring: string;

  verificado: string;
  dudoso: string;
  falso: string;
  sindatos: string;

  /** Cortinas de la aurora del fondo (rgba, las consume el gradiente). */
  auroraA: string;
  auroraB: string;
  auroraC: string;
  /** Overlay translúcido sobre `surface` para chips y filas. */
  overlay: string;
}

/** Dark es el canónico de la V1 (en la web es además el default del SSR). */
export const dark: Roles = {
  bg: raw.noche900,
  surface: raw.noche800,
  surfaceSunk: raw.noche900,
  border: raw.noche700,
  borderStrong: raw.noche600,

  text: raw.bruma100,
  textMuted: raw.gris300,
  textSubtle: raw.gris400,
  textDisabled: raw.gris500,
  display: raw.luz,

  accent: raw.aurora500,
  accentText: raw.aurora300,
  accentSolid: raw.aurora300,
  accentInk: raw.noche900,
  ring: raw.aurora300,

  verificado: raw.verificadoD,
  dudoso: raw.dudosoD,
  falso: raw.falsoD,
  sindatos: raw.sindatosD,

  auroraA: 'rgba(122, 90, 248, 0.50)',
  auroraB: 'rgba(185, 164, 255, 0.32)',
  auroraC: 'rgba(242, 232, 213, 0.16)',
  overlay: 'rgba(232, 236, 234, 0.06)',
};

/** Light es obligatorio en la V1: aula, impresión, captura de pantalla. */
export const light: Roles = {
  bg: raw.papel50,
  surface: '#FFFFFF',
  surfaceSunk: raw.papel100,
  border: raw.papel200,
  borderStrong: '#CDD3CD',

  text: raw.tinta,
  textMuted: '#4A5654',
  textSubtle: '#5C6664',
  textDisabled: '#8A9391',
  display: raw.tinta,

  accent: raw.aurora700,
  accentText: raw.aurora700,
  accentSolid: raw.aurora700,
  accentInk: raw.papel50,
  ring: raw.aurora700,

  verificado: raw.verificadoL,
  dudoso: raw.dudosoL,
  falso: raw.falsoL,
  sindatos: raw.sindatosL,

  auroraA: 'rgba(122, 90, 248, 0.18)',
  auroraB: 'rgba(76, 47, 184, 0.10)',
  auroraC: 'rgba(242, 232, 213, 0.40)',
  overlay: 'rgba(23, 28, 27, 0.04)',
};

/** Radios de la V1. `pill` es el chip del veredicto. */
export const radio = { sm: 8, md: 10, lg: 12, xl: 16, xxl: 20, pill: 999 } as const;

/**
 * Escala de espaciado de 4. En la web la da Tailwind; acá se escribe para no
 * tener números sueltos en los `StyleSheet`.
 */
export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48 } as const;

/**
 * Familias tipográficas. Los nombres son los que registra `useFonts()` en
 * `src/theme/fonts.ts` — si cambia uno, cambia allá también.
 */
export const font = {
  display: 'Archivo_600SemiBold',
  displayBold: 'Archivo_700Bold',
  sans: 'IBMPlexSans_400Regular',
  sansMedium: 'IBMPlexSans_500Medium',
  sansSemi: 'IBMPlexSans_600SemiBold',
  mono: 'IBMPlexMono_400Regular',
} as const;

/**
 * Escala de texto. La V1 define base = 17px (1rem), de ahí salen los pasos.
 * `lineHeight` va absoluto porque React Native no acepta múltiplos.
 */
export const type = {
  display: { fontFamily: font.displayBold, fontSize: 34, lineHeight: 38, letterSpacing: -0.6 },
  title: { fontFamily: font.display, fontSize: 24, lineHeight: 29, letterSpacing: -0.3 },
  heading: { fontFamily: font.display, fontSize: 19, lineHeight: 24 },
  body: { fontFamily: font.sans, fontSize: 17, lineHeight: 26 },
  bodyMedium: { fontFamily: font.sansMedium, fontSize: 17, lineHeight: 26 },
  small: { fontFamily: font.sans, fontSize: 15, lineHeight: 22 },
  caption: { fontFamily: font.sansMedium, fontSize: 13, lineHeight: 18 },
  mono: { fontFamily: font.mono, fontSize: 13, lineHeight: 20 },
  /** Etiquetas en mayúscula: chips, encabezados de sección. */
  overline: { fontFamily: font.sansSemi, fontSize: 12, lineHeight: 16, letterSpacing: 0.8 },
} as const;

/**
 * Las cortinas de la aurora del fondo: color sólido + opacidad del centro.
 *
 * Van separadas de `Roles` porque no son un rol que un componente pueda pedir:
 * las consume únicamente `components/aurora.tsx`, que necesita el color y la
 * opacidad por separado para armar el gradiente radial (un `rgba()` en el
 * `stopColor` de un SVG interpola hacia negro transparente y ensucia el borde).
 */
export const cortinas = {
  dark: [
    { color: raw.aurora500, opacidad: 0.4 },
    { color: raw.aurora300, opacidad: 0.26 },
    { color: raw.luz, opacidad: 0.1 },
  ],
  light: [
    { color: raw.aurora500, opacidad: 0.2 },
    { color: raw.aurora700, opacidad: 0.12 },
    { color: raw.luz, opacidad: 0.45 },
  ],
} as const;

/**
 * Los colores de la aurora boreal, por tono y por altura.
 *
 * Traducción de los tokens `--ab-*` de `apps/app/global.css`. Cada cortina es
 * un gradiente vertical de tres colores: `top` donde nace (se desvanece hacia
 * arriba), `mid` en el cuerpo y `low` en el dobladillo, que es el borde de
 * abajo, donde la aurora quema.
 *
 * `verde` es el color clásico de la aurora real y se usa como acento: casi
 * siempre apagado, aparece de a ratos.
 */
export const boreal = {
  dark: {
    a: { top: raw.aurora500, mid: raw.aurora300, low: raw.luz },
    b: { top: raw.aurora700, mid: raw.aurora500, low: raw.aurora300 },
    c: { top: raw.aurora300, mid: '#D9CCFF', low: raw.luz },
    verde: { top: '#22C98E', mid: '#3FF0B0', low: '#9DFFD8' },
  },
  light: {
    a: { top: raw.aurora300, mid: raw.aurora500, low: raw.aurora700 },
    b: { top: raw.aurora300, mid: raw.aurora300, low: raw.aurora500 },
    c: { top: raw.aurora300, mid: raw.aurora500, low: raw.aurora500 },
    verde: { top: '#7FDCB8', mid: '#3FB88A', low: '#1F8F66' },
  },
} as const;

export type TonoBoreal = keyof (typeof boreal)['dark'];
