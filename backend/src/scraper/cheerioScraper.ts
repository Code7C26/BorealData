import axios from "axios";
import * as cheerio from "cheerio";
import { ScrapedContent, ScraperOptions } from "./types";
import { stripControlChars } from "../utils/sanitize";

// Selectores que indican una SPA sin contenido renderizado en el servidor.
// Estos sitios se consideran "empty" y se rechazan.
const SPA_ROOT_SELECTORS = ["#root", "#app", "#__next", "[data-reactroot]"];

// Extrae texto limpio del HTML saca scripts, estilos, nav, footer, etc
function extractCleanText($: cheerio.CheerioAPI): { title: string; text: string } {
  // saca scripts, estilos, nav, footer, etc
  $("script, style, noscript, iframe, svg, nav, footer, header, form, aside").remove();

  // obtiene el title
  const title = $("title").first().text().trim() || $("h1").first().text().trim();

  // obtiene el contenido
  const container = $("article").length
    ? $("article")
    : $("main").length
    ? $("main")
    : $("body");

  // obtiene el texto de parrafos, encabezados y listas
  const text = container
    .find("p, h1, h2, h3, li")
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(Boolean)
    .join("\n");

  return { title: stripControlChars(title), text: stripControlChars(text, true) };
}

function looksLikeEmptySpa($: cheerio.CheerioAPI): boolean {
  // si hay alguno de estos selectores con menos de 50 caracteres es una SPA
  for (const selector of SPA_ROOT_SELECTORS) {
    const el = $(selector);
    if (el.length && el.text().trim().length < 50) {
      return true;
    }
  }
  return false;
}

export async function scrapeWithCheerio(
  url: string,
  options: ScraperOptions = {}
): Promise<ScrapedContent> {
  const { minTextLength = 500, timeoutMs = 10000 } = options;

  try {
    // descarga el HTML
    const { data: html } = await axios.get(url, {
      timeout: timeoutMs,
      headers: {
        // Algunos sitios bloquean requests de script
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
      },
      // Evita que axios tire excepción en 4xx/5xx y que rompa el proceso
      validateStatus: () => true,
    });

    // parsea el HTML
    const $ = cheerio.load(html);
    // limpia el HTML
    const { title, text } = extractCleanText($);
    // verifica si el contenido es suficiente
    const insufficient = text.length < minTextLength || looksLikeEmptySpa($);

    return {
      url,
      title,
      text,
      method: "cheerio",
      success: !insufficient,
      error: insufficient ? "insufficient_content" : undefined,
    };
  } catch (err) {
    return {
      url,
      title: "",
      text: "",
      method: "cheerio",
      success: false,
      error: err instanceof Error ? err.message : "unknown_error",
    };
  }
}
