/**
 * Idioma de la interfaz: español (el canónico) o inglés.
 *
 * Vive en una cookie y no en localStorage —a diferencia del modo de lectura— porque
 * acá el servidor SÍ tiene que saberlo: el modo se resuelve con CSS antes del primer
 * paint, pero el texto no. Si el servidor renderizara siempre en español, quien eligió
 * inglés vería la página entera en castellano hasta que hidrate, en cada navegación dura.
 * Con la cookie, el root layout lee el idioma (ver idioma-servidor.ts) y el HTML ya sale
 * traducido, con el `lang` correcto en <html>.
 *
 * Los textos viven al lado de cada componente, en un `traducciones({ es, en })`: el
 * castellano sigue estando donde siempre estuvo, y TypeScript obliga a que la versión en
 * inglés tenga exactamente la misma forma (ver `traducciones`).
 *
 * Lo que escribe el motor (titular, razonamiento, notas de las fuentes) no se traduce
 * acá: el front manda el idioma activo en el body de /analyze, /analyze/content y
 * /analyze/read (ver lib/api.ts) y Gemini lo escribe directamente en ese idioma. Los
 * análisis guardados antes de eso siguen en castellano.
 */

export const IDIOMAS = ['es', 'en'] as const
export type Idioma = (typeof IDIOMAS)[number]

export const IDIOMA_POR_DEFECTO: Idioma = 'es'

export const IDIOMA_COOKIE = 'aletheia-idioma'

/** Un año: es una preferencia, no una sesión. */
const IDIOMA_COOKIE_MAX_AGE_S = 60 * 60 * 24 * 365

/** El tag BCP 47 para formatear números y fechas (`toLocaleString`). */
export const TAG_IDIOMA: Record<Idioma, string> = {
  es: 'es-AR',
  en: 'en-US',
}

/** Cómo se nombra cada idioma en su propio idioma, para los selectores. */
export const NOMBRE_IDIOMA: Record<Idioma, string> = {
  es: 'Español',
  en: 'English',
}

export function esIdioma(valor: unknown): valor is Idioma {
  return (IDIOMAS as readonly unknown[]).includes(valor)
}

export type Textos<T> = Record<Idioma, T>

/**
 * Declara los textos de un componente en los dos idiomas.
 *
 * `T` se infiere SOLO del español (el `NoInfer` del inglés): si a la versión en inglés le
 * falta una clave, le sobra una o cambia un tipo, no compila. Sin esto, TypeScript
 * inferiría la unión de los dos objetos y una traducción incompleta pasaría callada.
 */
export function traducciones<T>(textos: { es: T; en: NoInfer<T> }): Textos<T> {
  return textos
}

/** Escribe la preferencia desde el cliente. No es httpOnly a propósito: la escribe JS. */
export function escribirCookieIdioma(idioma: Idioma) {
  if (typeof document === 'undefined') return
  document.cookie = `${IDIOMA_COOKIE}=${idioma}; path=/; max-age=${IDIOMA_COOKIE_MAX_AGE_S}; samesite=lax`
}
