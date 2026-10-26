import { cookies } from 'next/headers'
import { esIdioma, IDIOMA_COOKIE, IDIOMA_POR_DEFECTO, type Idioma } from '@/lib/idioma'

/**
 * El idioma de esta request, para el root layout, las páginas server y `generateMetadata`.
 *
 * Separado de lib/idioma.ts porque importa `next/headers`, que no puede llegar a un
 * componente de cliente. Ojo: leer cookies vuelve dinámica la ruta que lo llama — y como
 * lo llama el root layout, todas las páginas se renderizan por request.
 */
export async function leerIdioma(): Promise<Idioma> {
  const valor = (await cookies()).get(IDIOMA_COOKIE)?.value
  return esIdioma(valor) ? valor : IDIOMA_POR_DEFECTO
}
