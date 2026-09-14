import puppeteer from "puppeteer";
import * as cheerio from "cheerio";
import { ScrapedContent, ScraperOptions } from "./types";
import { stripControlChars } from "../utils/sanitize";

export async function scrapeWithPuppeteer(
  url: string,
  options: ScraperOptions = {}
): Promise<ScrapedContent> {
  const { timeoutMs = 20000 } = options;

  let browser;
  try {
    // abre el navegador sin interfaz (headless: true)
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    // abre una nueva pestaña
    const page = await browser.newPage();
    // agrega un user agent falso
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
    );

    // "networkidle2" espera a que la mayoría de los requests de la pestaña terminen,
    await page.goto(url, { waitUntil: "networkidle2", timeout: timeoutMs });

    // obtiene y parsea el HTML con cheerio
    const html = await page.content();
    const $ = cheerio.load(html);

    // limpia el HTML
    $("script, style, noscript, iframe, svg, nav, footer, header, form, aside").remove();

    const title = stripControlChars(
      $("title").first().text().trim() || $("h1").first().text().trim()
    );

    const container = $("article").length
      ? $("article")
      : $("main").length
      ? $("main")
      : $("body");

    const text = stripControlChars(
      container
        .find("p, h1, h2, h3, li")
        .map((_, el) => $(el).text().trim())
        .get()
        .filter(Boolean)
        .join("\n"),
      true
    );

    return {
      url,
      title,
      text,
      method: "puppeteer",
      success: text.length > 0,
      error: text.length === 0 ? "no_content_found" : undefined,
    };
  } catch (err) {
    return {
      url,
      title: "",
      text: "",
      method: "puppeteer",
      success: false,
      error: err instanceof Error ? err.message : "unknown_error",
    };
  } finally {
    // cierra el navegador
    if (browser) await browser.close();
  }
}
