import axios from "axios";
import * as cheerio from "cheerio";
import { ScrapedContent, ScraperOptions } from "./types";
import { bodyMatchesTitle, extractArticle } from "./extractArticle";

// Selectores que indican una SPA sin contenido renderizado en el servidor.
// Estos sitios se consideran "empty" y se rechazan.
const SPA_ROOT_SELECTORS = ["#root", "#app", "#__next", "[data-reactroot]"];

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
    const { title, text } = extractArticle($);
    // verifica si el contenido es suficiente (y si es la nota y no otra cosa)
    const insufficient =
      text.length < minTextLength || looksLikeEmptySpa($) || !bodyMatchesTitle(title, text);

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
