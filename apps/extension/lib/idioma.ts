/**
 * Idioma de la extensión: español o inglés.
 *
 * La extensión no tiene selector propio: sigue al de la web. La web manda el idioma por
 * el mismo puente que la sesión (apps/lib/extension-bridge.ts → auth-bridge.content.ts →
 * background.ts), y el background lo guarda en storage.local. Así, cambiar de idioma en
 * la web cambia también el panel, el menú del clic derecho y lo que escribe Gemini.
 *
 * Hasta que la extensión vea la web por primera vez no hay nada guardado: ahí manda el
 * idioma del navegador. Un Chrome en castellano arranca en castellano; cualquier otro, en
 * inglés, que se entiende más que el castellano para quien no habla ninguno de los dos.
 *
 * Espejo de apps/lib/idioma.ts en la web, sin la cookie.
 */

export const IDIOMAS = ['es', 'en'] as const;
export type Idioma = (typeof IDIOMAS)[number];

/** Clave en storage.local. La escribe solo background.ts (handleAuthSync). */
export const IDIOMA_KEY = 'aletheia_idioma';

export const TAG_IDIOMA: Record<Idioma, string> = {
  es: 'es-AR',
  en: 'en-US',
};

export function esIdioma(valor: unknown): valor is Idioma {
  return (IDIOMAS as readonly unknown[]).includes(valor);
}

export type Textos<T> = Record<Idioma, T>;

/**
 * Declara los textos en los dos idiomas. Como en la web, `T` sale solo del español (el
 * `NoInfer`): si a la versión en inglés le falta una clave o cambia un tipo, no compila.
 */
export function traducciones<T>(textos: { es: T; en: NoInfer<T> }): Textos<T> {
  return textos;
}

export function idiomaDelNavegador(): Idioma {
  try {
    return browser.i18n.getUILanguage().toLowerCase().startsWith('es') ? 'es' : 'en';
  } catch {
    return 'es';
  }
}

/** El idioma activo: el que mandó la web, o el del navegador si todavía no mandó ninguno. */
export async function leerIdioma(): Promise<Idioma> {
  try {
    const guardado = (await browser.storage.local.get(IDIOMA_KEY))[IDIOMA_KEY];
    if (esIdioma(guardado)) return guardado;
  } catch {
    // Sin storage se usa el respaldo.
  }
  return idiomaDelNavegador();
}

export async function guardarIdioma(idioma: Idioma): Promise<void> {
  await browser.storage.local.set({ [IDIOMA_KEY]: idioma });
}
