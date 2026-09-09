/*formato de contenido obtenido*/
export interface ScrapedContent {
  url: string;
  title: string;
  text: string;
  method: "cheerio" | "puppeteer";
  success: boolean;
  error?: string;
}

export interface ScraperOptions {
  /** Mínimo de caracteres de texto para considerar el scraping con Cheerio "suficiente" */
  minTextLength?: number;
  /** Timeout en ms para las requests/navegación */
  timeoutMs?: number;
}
