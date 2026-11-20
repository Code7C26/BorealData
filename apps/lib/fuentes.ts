import type { AnalysisSource } from './api'

/**
 * Separa las fuentes que se pueden comprobar de las que solo nombró el modelo.
 *
 * Por qué: las URLs nunca las escribe el modelo, salen de los resultados reales de la
 * búsqueda de Google (ver attachRealUrls en el backend). Una fuente sin URL es una que
 * Gemini citó sin que la búsqueda devolviera nada que la respalde. Chequeado midió en
 * abril de 2026 que Gemini inventa fuentes cuando se le piden fuentes confiables, así
 * que esas no pueden verse igual que las demás.
 *
 * La excepción es la fuente con postura "origen": es la publicación donde apareció la
 * afirmación, casi siempre la misma nota que se analizó. No es evidencia, es el punto de
 * partida, y queda con las comprobables. Si su dominio coincide con el de la nota y no
 * trae URL, se le pone la de la nota.
 */
export function separarFuentes(
  fuentes: AnalysisSource[],
  urlNota?: string | null,
): { conEnlace: AnalysisSource[]; sinEnlace: AnalysisSource[] } {
  const hostNota = hostSinWww(urlNota)
  const conEnlace: AnalysisSource[] = []
  const sinEnlace: AnalysisSource[] = []

  for (const fuente of fuentes) {
    const url = esHttp(fuente.url) ? fuente.url : null

    if (url) {
      conEnlace.push({ ...fuente, url })
    } else if (fuente.stance === 'origen') {
      const esLaNota = hostNota !== null && mismoDominio(fuente.domain, hostNota)
      conEnlace.push({ ...fuente, url: esLaNota ? (urlNota as string) : null })
    } else {
      sinEnlace.push({ ...fuente, url: null })
    }
  }

  return { conEnlace, sinEnlace }
}

function esHttp(url: string | null | undefined): url is string {
  if (!url) return false
  try {
    const { protocol } = new URL(url)
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}

function hostSinWww(url: string | null | undefined): string | null {
  if (!esHttp(url)) return null
  return new URL(url).hostname.toLowerCase().replace(/^www\./, '')
}

/** "clarin.com" coincide con "clarin.com" y con "www.clarin.com", y con subdominios. */
function mismoDominio(dominio: string, host: string): boolean {
  const d = dominio.toLowerCase().trim().replace(/^www\./, '')
  if (!d) return false
  return d === host || host.endsWith(`.${d}`) || d.endsWith(`.${host}`)
}
