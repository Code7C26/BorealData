"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scrapeUrl = scrapeUrl;
const cheerioScraper_1 = require("./cheerioScraper");
const puppeteerScraper_1 = require("./puppeteerScraper");
// Punto de entrada del módulo scraper
async function scrapeUrl(url, options = {}) {
    //busca resultados con cheerio
    const cheerioResult = await (0, cheerioScraper_1.scrapeWithCheerio)(url, options);
    if (cheerioResult.success) {
        return cheerioResult;
    }
    //si no hay resultados con cheerio, busca con puppeteer
    const puppeteerResult = await (0, puppeteerScraper_1.scrapeWithPuppeteer)(url, options);
    return puppeteerResult;
}
