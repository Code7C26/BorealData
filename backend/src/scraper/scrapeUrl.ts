import { scrapeWithCheerio } from "./cheerioScraper";
import { scrapeWithPuppeteer } from "./puppeteerScraper";
import { ScrapedContent, ScraperOptions } from "./types";

// Punto de entrada del módulo scraper
export async function scrapeUrl(
  url: string,
  options: ScraperOptions = {}
): Promise<ScrapedContent> {
  //busca resultados con cheerio
  const cheerioResult = await scrapeWithCheerio(url, options);
  if (cheerioResult.success) {
    return cheerioResult;
  }
  //si no hay resultados con cheerio, busca con puppeteer
  const puppeteerResult = await scrapeWithPuppeteer(url, options);
  return puppeteerResult;
}
