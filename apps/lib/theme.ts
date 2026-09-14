/**
 * Modo claro / oscuro.
 *
 * Dark es el canónico y el valor que manda el servidor; light es obligatorio
 * (aula, informe impreso, captura para compartir, astigmatismo) y se entrega
 * con la misma cobertura de tokens y contraste AA.
 *
 * El toggle solo escribe `data-theme` en <html> y lo persiste en localStorage:
 * no hay una sola clase de componente que dependa del modo, todo sale de los
 * roles semánticos de global.css.
 */

export type Theme = 'dark' | 'light'

export const THEME_STORAGE_KEY = 'aletheia-theme'

/**
 * Script que corre en el <head>, antes del primer paint, para que quien tiene
 * light elegido no vea un flash de Noche en cada navegación dura.
 *
 * Va como string y no como módulo a propósito: tiene que ejecutarse de forma
 * síncrona antes de que el navegador pinte, y cualquier import lo haría diferido.
 * El try/catch cubre el modo incógnito y los navegadores con storage bloqueado,
 * donde el solo hecho de leer localStorage tira excepción.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(t==='light'||t==='dark'){document.documentElement.dataset.theme=t;}}catch(e){}})();`

export function getStoredTheme(): Theme | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
    return stored === 'light' || stored === 'dark' ? stored : null
  } catch {
    return null
  }
}

export function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.theme = theme
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // Storage bloqueado: el modo igual se aplica, solo no sobrevive al reload.
  }
}
