import { Router, type Request, type Response } from "express";
import { requireAuth } from "../auth/verifyAuth.js";
import { callGemini } from "../gemini/geminiClient.js";
import {
  CLIENT_CONTENT_KINDS,
  INVALID_LANGUAGE_ERROR,
  KNOWN_PLATFORMS,
  parseLanguage,
  type ClientContentKind,
  type Language,
  type Platform,
} from "../gemini/types.js";
import { saveAnalysis } from "../db/analysesRepository.js";
import { upsertUser } from "../db/usersRepository.js";
import { cleanContentText, cleanInlineText, looksLikeUrl } from "../utils/contentText.js";
import { sanitizePageUrl } from "../utils/pageUrl.js";
import { analyzeRateLimiter, ANALYZE_RATE_LIMIT } from "../utils/analyzeLimiter.js";
import { cronometro, log, mensajeDeError, resumenDeFuentes } from "../utils/logger.js";

/** Mismo tope que maxInputChars de callGemini: rechazar es más honesto que recortar en silencio. */
const MAX_TEXT_CHARS = 12_000;
/** "Murió el papa" son 13 caracteres y es justo lo que hay que poder verificar. */
const MIN_TEXT_CHARS = 8;
const MAX_TITLE_CHARS = 300;
const MAX_AUTHOR_CHARS = 100;

const PLATFORM_LABELS: Record<Language, Record<Platform, string>> = {
  es: {
    facebook: "Facebook",
    instagram: "Instagram",
    x: "X",
    whatsapp: "WhatsApp",
    tiktok: "TikTok",
    otro: "otra plataforma",
  },
  en: {
    facebook: "Facebook",
    instagram: "Instagram",
    x: "X",
    whatsapp: "WhatsApp",
    tiktok: "TikTok",
    otro: "another platform",
  },
};

/** Título de respaldo si el cliente no manda uno. Se ve en el historial: va en el idioma pedido. */
function fallbackTitle(author: string | null, platform: Platform | null, language: Language): string {
  const where = platform ? PLATFORM_LABELS[language][platform] : null;
  if (language === "en") {
    if (author) return `Post by ${author}${where ? ` on ${where}` : ""}`;
    return where ? `Post on ${where}` : "";
  }
  if (author) return `Publicación de ${author}${where ? ` en ${where}` : ""}`;
  return where ? `Publicación en ${where}` : "";
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

const router = Router();

/**
 * POST /analyze/content — paso 2: verifica CONTENIDO que manda el cliente, en vez de una
 * URL que el servidor tendría que ir a buscar (y que, si es privada, solo vería el muro de login).
 * Header obligatorio: Authorization: Bearer <Firebase ID token>
 *
 * Body (solo texto: las imágenes se leen antes, en POST /analyze/read):
 * {
 *   "source":  { "kind": "capture" | "selection" | "image" | "text",
 *                "platform": "facebook" | ... | null,   // pista del cliente, no confiable
 *                "pageUrl": "https://..." | null,       // solo contexto: NUNCA se scrapea
 *                "capturedAt": "2026-09-23T18:00:00Z" },   // se ignora
 *   "content": { "title": "...", "text": "...", "author": "@usuario" },
 *   "language": "es" | "en"   // opcional, default "es": idioma en que escribe Gemini
 * }
 *
 * Responde con la MISMA forma que POST /analyze (id, url, title, scrapeMethod, verdict,
 * confidence, headline, lead, summary, reasoning, sources, toneFlags) más `shareable: false`,
 * así el panel reusa mapBackendResult()/ResultView sin cambios.
 *
 * Reglas de privacidad (no negociables, ver el brief):
 * - NO hay caché por URL, ni la del propio usuario ni la compartida entre usuarios: la
 *   misma pageUrl (instagram.com/) puede ser un posteo distinto cada vez, y el análisis de
 *   un posteo privado nunca puede servírsele a otra persona.
 * - `source_type` lo fija el servidor a partir de `kind` (validado contra una lista), y las
 *   consultas de caché de /analyze filtran `source_type = 'url'`.
 * - El texto del contenido no se persiste: saveAnalysis() recibe `text: ""` y solo guarda
 *   el análisis (resumen, razonamiento, fuentes). Tampoco se loguea.
 * - Si no se pudo resolver el usuario, no se guarda nada (no se dejan filas huérfanas de
 *   contenido privado).
 */
router.post("/analyze/content", requireAuth, async (req: Request, res: Response) => {
  const body = isRecord(req.body) ? req.body : {};
  const source = isRecord(body.source) ? body.source : {};
  const content = isRecord(body.content) ? body.content : {};

  const kind = source.kind;
  if (typeof kind !== "string" || !(CLIENT_CONTENT_KINDS as readonly string[]).includes(kind)) {
    return res.status(400).json({
      error: `Falta 'source.kind' o es inválido (opciones: ${CLIENT_CONTENT_KINDS.join(", ")}).`,
    });
  }
  const contentKind = kind as ClientContentKind;

  const language = parseLanguage(body.language);
  if (!language) {
    return res.status(400).json({ error: INVALID_LANGUAGE_ERROR });
  }

  if (typeof content.text !== "string") {
    return res.status(400).json({ error: "Falta 'content.text' (string) en el body." });
  }
  const text = cleanContentText(content.text);

  if (text.length < MIN_TEXT_CHARS) {
    return res.status(400).json({
      error: `El texto es demasiado corto para analizarlo (mínimo ${MIN_TEXT_CHARS} caracteres).`,
    });
  }
  if (text.length > MAX_TEXT_CHARS) {
    return res.status(400).json({
      error: `El texto es demasiado largo (máximo ${MAX_TEXT_CHARS} caracteres). Acortalo o analizá solo la parte relevante.`,
    });
  }
  if (looksLikeUrl(text)) {
    // Pegar un link en el cuadro de "texto de la noticia" es un caso real: en vez de gastar
    // Gemini en analizar una URL como si fuera un posteo, se le dice al cliente que use /analyze.
    return res.status(400).json({
      error: "Eso es un enlace, no un texto. Analizalo como URL.",
      code: "is_url",
    });
  }

  const platform: Platform | null =
    typeof source.platform === "string" && (KNOWN_PLATFORMS as readonly string[]).includes(source.platform)
      ? (source.platform as Platform)
      : null;
  const author = cleanInlineText(content.author, MAX_AUTHOR_CHARS);
  const pageUrl = sanitizePageUrl(source.pageUrl);

  const title =
    cleanInlineText(content.title, MAX_TITLE_CHARS) ?? fallbackTitle(author, platform, language);

  // El texto NUNCA entra al log (ver logger.ts y la política de privacidad): van el
  // tipo, la plataforma y el tamaño, que alcanzan para diagnosticar sin guardar
  // contenido de nadie.
  const reloj = cronometro();
  const uid = req.user!.uid;
  const contexto = { uid, kind: contentKind, platform, language, chars: text.length };

  try {
    const userId = await upsertUser(req.user!.uid, req.user!.email);

    const rate = analyzeRateLimiter.consume(req.user!.uid);
    if (!rate.allowed) {
      res.set("Retry-After", String(rate.retryAfterSeconds));
      log.warn("analyzeContent.rateLimit", { ...contexto, retryAfterS: rate.retryAfterSeconds });
      return res.status(429).json({
        error: `Alcanzaste el límite de ${ANALYZE_RATE_LIMIT} análisis nuevos por hora. Probá de nuevo en unos minutos.`,
      });
    }

    const analysis = await callGemini(title, text, { contentKind, language });

    if (!analysis.success) {
      log.error("analyzeContent.geminiFallido", {
        ...contexto,
        detail: analysis.error,
        latencyMs: reloj(),
      });
      return res.status(502).json({
        error: "El análisis con Gemini falló.",
        detail: analysis.error,
      });
    }

    let id: string | null = null;
    if (userId) {
      // saveAnalysis() solo recibe url/título/método: el texto original ni siquiera se le pasa.
      const stored = { url: pageUrl ?? "", title, method: "capture" };
      id = await saveAnalysis(stored, analysis, userId, {
        sourceType: contentKind,
        capturePlatform: platform,
        language,
      });
    }

    log.info("analyzeContent.ok", {
      ...contexto,
      id,
      guardado: id !== null,
      verdict: analysis.verdict,
      confidence: analysis.confidence,
      ...resumenDeFuentes(analysis.sources),
      latencyMs: reloj(),
    });

    return res.status(200).json({
      id,
      url: pageUrl ?? "",
      title,
      scrapeMethod: "capture",
      verdict: analysis.verdict,
      confidence: analysis.confidence,
      headline: analysis.headline,
      lead: analysis.lead,
      summary: analysis.summary,
      reasoning: analysis.reasoning,
      sources: analysis.sources,
      toneFlags: analysis.toneFlags,
      language,
      // El link público de "Compartir resultado" no aplica a contenido del cliente (ver
      // getAnalysisById): el front no debería ofrecer ese botón aunque haya `id`.
      shareable: false,
    });
  } catch (err) {
    log.error("analyzeContent.error", {
      ...contexto,
      detail: mensajeDeError(err),
      latencyMs: reloj(),
    });
    return res.status(500).json({
      error: "Error inesperado en /analyze/content.",
      detail: err instanceof Error ? err.message : "Error desconocido.",
    });
  }
});

export default router;
