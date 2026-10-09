/**
 * La preferencia de "sidebar colapsado".
 *
 * Vive acá y no dentro de `components/sidebar.tsx` porque la leen dos mundos distintos:
 * el componente de React, y el script que corre en el `<body>` antes del primer paint
 * (ver SIDEBAR_INIT_SCRIPT). Con la clave en un solo lugar no se pueden desincronizar.
 *
 * Por qué hace falta el script: el servidor no puede saber la preferencia —está en
 * localStorage, que solo existe en el browser—, así que mandaba el HTML con el sidebar
 * expandido y el cliente lo corregía al hidratar. Eso era un salto de 288 px a 76 px que
 * además corría el contenido de toda la página. Mismo problema y misma solución que el
 * modo claro/oscuro (ver THEME_INIT_SCRIPT en lib/theme.ts).
 */

export const COLAPSO_STORAGE_KEY = 'aletheia_sidebar_colapsada'

/** El atributo que el script escribe en <html> y que mira el CSS. */
export const COLAPSO_ATTR = 'data-sidebar'
export const COLAPSO_VALOR = 'colapsado'

/**
 * Corre de forma síncrona antes del primer paint y deja el ancho correcto escrito en
 * <html>, así el navegador pinta el sidebar en su medida final sin esperar a React.
 *
 * Va como string y no como módulo a propósito: cualquier import lo volvería diferido, y
 * entonces llegaría tarde — justo lo que vinimos a evitar. El try/catch cubre incógnito
 * y los navegadores con storage bloqueado, donde el solo hecho de leer tira excepción.
 */
export const SIDEBAR_INIT_SCRIPT = `(function(){try{if(localStorage.getItem('${COLAPSO_STORAGE_KEY}')==='true'){document.documentElement.setAttribute('${COLAPSO_ATTR}','${COLAPSO_VALOR}');}}catch(e){}})();`

/**
 * Lo elegido en esta pestaña. Existe para que el colapso siga funcionando con el storage
 * bloqueado: ahí la escritura falla, y sin esto la lectura seguiría devolviendo el valor
 * viejo y el sidebar no se colapsaría nunca.
 */
let enMemoria: boolean | null = null

const oyentes = new Set<() => void>()

export function leerColapso(): boolean {
  if (enMemoria !== null) return enMemoria
  if (typeof document === 'undefined') return false
  // Se lee del DOM y no de localStorage: el script del arranque ya resolvió el valor, y
  // así la fuente de verdad del render es la misma que usa el CSS.
  return document.documentElement.getAttribute(COLAPSO_ATTR) === COLAPSO_VALOR
}

export function escribirColapso(valor: boolean) {
  enMemoria = valor

  if (typeof document !== 'undefined') {
    if (valor) document.documentElement.setAttribute(COLAPSO_ATTR, COLAPSO_VALOR)
    else document.documentElement.removeAttribute(COLAPSO_ATTR)
  }

  try {
    window.localStorage.setItem(COLAPSO_STORAGE_KEY, String(valor))
  } catch {
    // Storage bloqueado: el colapso igual se aplica, solo no sobrevive al reload.
  }

  for (const avisar of oyentes) avisar()
}

export function suscribirAlColapso(avisar: () => void): () => void {
  oyentes.add(avisar)
  return () => {
    oyentes.delete(avisar)
  }
}
