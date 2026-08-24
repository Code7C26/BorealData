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
exports.scrapeWithCheerio = scrapeWithCheerio;
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
// Selectores que indican una SPA sin contenido renderizado en el servidor.
// Estos sitios se consideran "empty" y se rechazan.
const SPA_ROOT_SELECTORS = ["#root", "#app", "#__next", "[data-reactroot]"];
// Extrae texto limpio del HTML saca scripts, estilos, nav, footer, etc
function extractCleanText($) {
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
    return { title, text };
}
function looksLikeEmptySpa($) {
    // si hay alguno de estos selectores con menos de 50 caracteres es una SPA
    for (const selector of SPA_ROOT_SELECTORS) {
        const el = $(selector);
        if (el.length && el.text().trim().length < 50) {
            return true;
        }
    }
    return false;
}
async function scrapeWithCheerio(url, options = {}) {
    const { minTextLength = 500, timeoutMs = 10000 } = options;
    try {
        // descarga el HTML
        const { data: html } = await axios_1.default.get(url, {
            timeout: timeoutMs,
            headers: {
                // Algunos sitios bloquean requests de script
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
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
    }
    catch (err) {
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
