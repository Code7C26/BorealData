/**
 * Idioma de la interfaz: español (el canónico) o inglés.
 *
 * Espejo de `apps/lib/idioma.ts`, con una sola diferencia de fondo: allá la
 * preferencia vive en una cookie porque el servidor tiene que leerla para
 * renderizar el HTML ya traducido. Acá no hay servidor que renderice, así que
 * va a AsyncStorage, igual que el modo de color.
 *
 * Los textos viven al lado de cada pantalla, en un `traducciones({ es, en })`:
 * el castellano sigue estando donde siempre estuvo, y TypeScript obliga a que
 * la versión en inglés tenga exactamente la misma forma.
 *
 * Lo que escribe el motor (titular, razonamiento, notas de las fuentes) no se
 * traduce acá: la app manda el idioma activo en el body de /analyze,
 * /analyze/content y /analyze/read, y Gemini lo escribe directamente en ese
 * idioma. Los análisis guardados antes de eso siguen en castellano.
 */

export const IDIOMAS = ['es', 'en'] as const;
export type Idioma = (typeof IDIOMAS)[number];

export const IDIOMA_POR_DEFECTO: Idioma = 'es';

/** El tag BCP 47 para formatear números y fechas (`toLocaleString`). */
export const TAG_IDIOMA: Record<Idioma, string> = {
  es: 'es-AR',
  en: 'en-US',
};

/** Cómo se nombra cada idioma en su propio idioma, para el selector. */
export const NOMBRE_IDIOMA: Record<Idioma, string> = {
  es: 'Español',
  en: 'English',
};

export function esIdioma(valor: unknown): valor is Idioma {
  return (IDIOMAS as readonly unknown[]).includes(valor);
}

export type Textos<T> = Record<Idioma, T>;

/**
 * Declara los textos de una pantalla en los dos idiomas.
 *
 * `T` se infiere SOLO del español (el `NoInfer` del inglés): si a la versión en
 * inglés le falta una clave, le sobra una o cambia un tipo, no compila. Sin
 * esto, TypeScript inferiría la unión de los dos objetos y una traducción
 * incompleta pasaría callada.
 */
export function traducciones<T>(textos: { es: T; en: NoInfer<T> }): Textos<T> {
  return textos;
}
