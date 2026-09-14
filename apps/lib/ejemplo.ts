import type { AnalyzeResponse } from '@/lib/api'

/**
 * El análisis precargado de "Probar un ejemplo".
 *
 * Es la forma más rápida de explicar el producto sin copy: en vez de contarle a
 * alguien qué devuelve AletheIA, se lo mostramos entero — veredicto, confianza,
 * fuentes con su postura (incluidas las que contradicen) y los pasos del
 * razonamiento. Es el caso canónico de la identidad de marca V1.
 *
 * No pega contra el backend a propósito: no gasta una llamada real a Gemini y
 * funciona igual sin sesión.
 */
export const ANALISIS_EJEMPLO: AnalyzeResponse = {
  url: 'https://bienestar-natural.blog/salud/pan-integral-insomnio-oslo',
  title: 'Un estudio noruego confirma que el pan integral de noche provoca insomnio',
  scrapeMethod: 'ejemplo',
  verdict: 'falso',
  confidence: 4,
  headline: 'No encontramos respaldo para esta afirmación',
  lead: 'El estudio que la nota atribuye a la Universidad de Oslo no existe en sus registros públicos y ningún medio primario lo reporta.',
  summary:
    'La nota afirma que comer pan integral por la noche provoca insomnio y lo atribuye a una investigación de la Universidad de Oslo. No enlaza a la publicación ni nombra a los autores.',
  reasoning: [
    'La nota atribuye un estudio a la Universidad de Oslo, pero no enlaza a ninguna publicación.',
    'El repositorio abierto de la universidad no tiene registro del trabajo ni de sus autores.',
    'Dos verificadores independientes revisaron la misma afirmación en los últimos 30 días.',
    'La cadena se origina en un blog sin autoría, referencias ni fecha de publicación.',
  ],
  sources: [
    {
      domain: 'uio.no',
      title: 'Universitetet i Oslo',
      url: 'https://www.uio.no/english/research/',
      stance: 'contradice',
      note: 'No registra el estudio ni a los autores citados',
    },
    {
      domain: 'efeverifica.com',
      title: 'EFE Verifica',
      url: 'https://efeverifica.com/',
      stance: 'contradice',
      note: 'Desmintió la afirmación el 9 sep 2026',
    },
    {
      domain: 'pubmed.ncbi.nlm.nih.gov',
      title: 'PubMed',
      url: 'https://pubmed.ncbi.nlm.nih.gov/',
      stance: 'sin-datos',
      note: 'Sin publicaciones que vinculen ambos temas',
    },
    {
      domain: 'bienestar-natural.blog',
      title: 'Bienestar Natural',
      url: null,
      stance: 'origen',
      note: 'Primera aparición de la nota, sin autoría',
    },
  ],
  toneFlags: ['titular tipo clickbait', 'estudio citado sin referencia', 'apelación a la autoridad'],
}

/** Fecha fija del ejemplo — la misma que ilustra la card en la identidad V1. */
export const FECHA_EJEMPLO = '2026-09-11T14:32:00-03:00'
