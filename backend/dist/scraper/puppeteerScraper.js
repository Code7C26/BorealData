"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scrapeWithPuppeteer = scrapeWithPuppeteer;
const puppeteer_1 = __importDefault(require("puppeteer"));
const cheerio = __importStar(require("cheerio"));
async function scrapeWithPuppeteer(url, options = {}) {
    const { timeoutMs = 20000 } = options;
    let browser;
    try {
        // abre el navegador sin interfaz (headless: true)
        browser = await puppeteer_1.default.launch({
            headless: true,
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });
        // abre una nueva pestaña
        const page = await browser.newPage();
        // agrega un user agent falso
        await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36");
        // "networkidle2" espera a que la mayoría de los requests de la pestaña terminen,
        await page.goto(url, { waitUntil: "networkidle2", timeout: timeoutMs });
        // obtiene y parsea el HTML con cheerio
        const html = await page.content();
        const $ = cheerio.load(html);
        // limpia el HTML
        $("script, style, noscript, iframe, svg, nav, footer, header, form, aside").remove();
        const title = $("title").first().text().trim() || $("h1").first().text().trim();
        const container = $("article").length
            ? $("article")
            : $("main").length
                ? $("main")
                : $("body");
        const text = container
            .find("p, h1, h2, h3, li")
            .map((_, el) => $(el).text().trim())
            .get()
            .filter(Boolean)
            .join("\n");
        return {
            url,
            title,
            text,
            method: "puppeteer",
            success: text.length > 0,
            error: text.length === 0 ? "no_content_found" : undefined,
        };
    }
    catch (err) {
        return {
            url,
            title: "",
            text: "",
            method: "puppeteer",
            success: false,
            error: err instanceof Error ? err.message : "unknown_error",
        };
    }
    finally {
        // cierra el navegador
        if (browser)
            await browser.close();
    }
}
