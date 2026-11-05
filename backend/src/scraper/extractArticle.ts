import type * as cheerio from "cheerio";
import { stripControlChars } from "../utils/sanitize";

/** Lo que nunca es cuerpo de nota. */
const JUNK_SELECTORS = "script, style, noscript, iframe, svg, nav, footer, header, form, aside";

/** Un <p> más corto que esto suele ser un epígrafe, un "Leer más" o la bajada de una tarjeta. */
const MIN_PARAGRAPH_CHARS = 40;

/**
 * Qué fracción del texto en párrafos de la página tiene que tener un contenedor para
 * considerarlo "el cuerpo". Por debajo, se sube un nivel (article → main → body).
 */
const MIN_SHARE_OF_PAGE = 0.5;

/** Puntaje de un contenedor: cuánto texto tiene en párrafos "de verdad". */
function paragraphScore($: cheerio.CheerioAPI, el: cheerio.Cheerio<any>): number {
  let total = 0;
  el.find("p").each((_, p) => {
    const len = $(p).text().trim().length;
    if (len >= MIN_PARAGRAPH_CHARS) total += len;
  });
  return total;
}

/**
 * Elige el elemento que contiene el cuerpo de la nota.
 *
 * Antes se tomaba `$("article")` entero si había alguno. Falla en sitios como La Nación
 * (5-nov-2026): sus únicos `<article>` son las tarjetas de "notas relacionadas", y el
 * cuerpo vive en `<p>` sueltos dentro de `<main>`. El scraper le pasaba a Gemini cuatro
 * titulares ajenos (Everest, Paraguay, Brasil...) y el análisis salía falso.
 *
 * Ahora se puntúa cada candidato por el texto de sus párrafos largos y se usa el más
 * específico que concentre al menos la mitad del texto de la página.
 */
export function pickArticleContainer($: cheerio.CheerioAPI): cheerio.Cheerio<any> {
  const body = $("body").length ? $("body").first() : $.root();
  const pageScore = paragraphScore($, body);
  if (pageScore === 0) {
    // Sin párrafos largos no hay nada que puntuar: el orden de siempre.
    return $("article").length ? $("article") : $("main").length ? $("main") : body;
  }

  const levels = ["[itemprop='articleBody']", "article", "main, [role='main']"];
  for (const selector of levels) {
    let best: cheerio.Cheerio<any> | null = null;
    let bestScore = 0;
    $(selector).each((_, el) => {
      const node = $(el);
      const score = paragraphScore($, node);
      if (score > bestScore) {
        best = node;
        bestScore = score;
      }
    });
    if (best && bestScore >= pageScore * MIN_SHARE_OF_PAGE) return best;
  }
  return body;
}

/** Saca título y cuerpo de una página ya cargada en cheerio. Modifica `$` (borra la basura). */
export function extractArticle($: cheerio.CheerioAPI): { title: string; text: string } {
  $(JUNK_SELECTORS).remove();

  const title = $("title").first().text().trim() || $("h1").first().text().trim();

  const container = pickArticleContainer($);
  // Los <article> de adentro sin ningún párrafo largo son tarjetas de otras notas (solo
  // titular, a lo sumo una bajada corta): se sacan para no mezclarlas con la nota. Los que
  // sí tienen párrafos se dejan, por si parte del cuerpo vive ahí.
  container.find("article").each((_, el) => {
    if (paragraphScore($, $(el)) === 0) $(el).remove();
  });

  const text = container
    .find("p, h1, h2, h3, li")
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(Boolean)
    .join("\n");

  return { title: stripControlChars(title), text: stripControlChars(text, true) };
}

/** Palabras que no dicen nada del tema de una nota. */
const STOPWORDS = new Set([
  "sobre", "entre", "desde", "hasta", "durante", "contra", "donde", "cuando", "porque",
  "luego", "tras", "segun", "todos", "todas", "otros", "otras", "estos", "estas", "puede",
  "about", "after", "before", "their", "there", "where", "which", "while", "would", "could",
  "nacion", "clarin", "infobae", "pagina", "noticias", "news",
]);

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Palabras con peso del título, sin el " - NOMBRE DEL MEDIO" del final. */
function titleKeywords(title: string): string[] {
  const sinMedio = title.replace(/\s+[-|–—]\s+[^-|–—]+$/, "");
  const words = normalize(sinMedio).match(/[a-z0-9ñ]{5,}/g) ?? [];
  return [...new Set(words.filter((w) => !STOPWORDS.has(w)))];
}

/**
 * ¿El cuerpo extraído habla de lo mismo que el título? Red de seguridad contra el caso de
 * arriba: si de las palabras con peso del título no aparece ninguna en el cuerpo, lo que
 * se scrapeó no es la nota. Con menos de 3 palabras en el título no hay base para juzgar.
 */
export function bodyMatchesTitle(title: string, text: string): boolean {
  const keywords = titleKeywords(title);
  if (keywords.length < 3) return true;
  const body = normalize(text);
  return keywords.some((w) => body.includes(w));
}
