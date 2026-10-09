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

/** Suscriptores de useTheme(), para que todos los toggles de la página se enteren. */
const oyentes = new Set<() => void>()

export function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.theme = theme
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // Storage bloqueado: el modo igual se aplica, solo no sobrevive al reload.
  }
  for (const avisar of oyentes) avisar()
}

/**
 * El modo activo, para los componentes que lo dibujan (el toggle de la barra, el
 * selector de Configuración).
 *
 * Va con `useSyncExternalStore` y no con `useState` + `useEffect` porque el modo real
 * es un dato que vive AFUERA de React: lo escribe el script del `<head>` antes del
 * primer paint, y lo cambia `applyTheme` desde cualquier parte. Leerlo en un efecto
 * —que es lo que se hacía— significaba renderizar una vez con "dark" y corregir
 * después, que es justo la cascada de renders que marca `react-hooks/set-state-in-effect`.
 *
 * `getServerSnapshot` devuelve 'dark' porque es lo que el servidor renderiza; en el
 * cliente, el primer snapshot ya es el valor real, así que el ícono no parpadea.
 *
 * El snapshot devuelve un string: `useSyncExternalStore` compara por identidad y los
 * strings se comparan por valor, así que no hace falta cachear nada.
 */
export function leerTemaActual(): Theme {
  if (typeof document === 'undefined') return 'dark'
  const enElDom = document.documentElement.dataset.theme
  if (enElDom === 'light' || enElDom === 'dark') return enElDom
  return getStoredTheme() ?? 'dark'
}

export function suscribirAlTema(avisar: () => void): () => void {
  oyentes.add(avisar)
  return () => {
    oyentes.delete(avisar)
  }
}
