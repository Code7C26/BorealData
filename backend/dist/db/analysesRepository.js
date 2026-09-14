"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveAnalysis = saveAnalysis;
exports.saveReusedAnalysis = saveReusedAnalysis;
exports.getAnalysesByUserId = getAnalysesByUserId;
exports.getAnalysisById = getAnalysisById;
exports.getAnalysisForUserByUrl = getAnalysisForUserByUrl;
exports.getLatestAnalysisByUrl = getLatestAnalysisByUrl;
exports.getGlobalStats = getGlobalStats;
const pool_js_1 = require("./pool.js");
const types_js_1 = require("../gemini/types.js");
/** Un uuid v4 tal como lo genera `gen_random_uuid()`. Cualquier otra cosa ni toca la DB. */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/**
 * INSERT compartido por saveAnalysis() y saveReusedAnalysis() — mismo try/catch
 * best-effort. Devuelve el id de la fila nueva (el que va en el link público de
 * /resultado/:id, ver getAnalysisById() más abajo), o null si el guardado falló.
 */
async function insertAnalysisRow(fields, userId) {
    try {
        const pool = await (0, pool_js_1.getPool)();
        const result = await pool.query(`INSERT INTO analyses
        (url, title, scrape_method, verdict, confidence, headline, lead_text,
         summary, reasoning, sources, tone_flags, user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING id`, [
            fields.url,
            fields.title,
            fields.scrapeMethod,
            fields.verdict,
            fields.confidence,
            fields.headline,
            fields.lead,
            fields.summary,
            JSON.stringify(fields.reasoning),
            JSON.stringify(fields.sources),
            JSON.stringify(fields.toneFlags),
            userId,
        ]);
        return result.rows[0]?.id ?? null;
    }
    catch (err) {
        console.error("No se pudo guardar el análisis en la DB:", err instanceof Error ? err.message : err);
        return null;
    }
}
/**
 * Guarda el resultado de un análisis exitoso. No propaga errores: si la DB no está
 * configurada o el insert falla, loguea y devuelve false, para no tirar abajo la
 * respuesta de /analyze por un problema de persistencia (funcionalidad secundaria,
 * no bloqueante para el usuario).
 *
 * `userId` es el id interno (uuid, tabla `users`) del usuario autenticado, ya resuelto
 * por upsertUser() en usersRepository.ts — no el uid de Firebase.
 */
async function saveAnalysis(scraped, analysis, userId = null) {
    return insertAnalysisRow({
        url: scraped.url,
        title: scraped.title,
        scrapeMethod: scraped.method,
        verdict: analysis.verdict,
        confidence: analysis.confidence,
        headline: analysis.headline,
        lead: analysis.lead,
        summary: analysis.summary,
        reasoning: analysis.reasoning,
        sources: analysis.sources,
        toneFlags: analysis.toneFlags,
    }, userId);
}
/**
 * Guarda una fila de historial para `userId` reutilizando un análisis ya hecho (por este
 * mismo usuario u otro) para la misma URL — sin volver a scrapear ni llamar a Gemini. Ver
 * getLatestAnalysisByUrl() y su uso en routes/analyze.ts.
 */
async function saveReusedAnalysis(cached, userId) {
    return insertAnalysisRow(cached, userId);
}
/** Las columnas que hace falta leer en todas las queries (nuevas + legacy). */
const SELECT_COLUMNS = `id, url, title, scrape_method, verdict, confidence, headline,
            lead_text, summary, reasoning, sources, tone_flags, created_at,
            score, label, explanation, claim_vs_evidence`;
// ─────────────────────────────────────────────────────────────────────────────
// Compatibilidad con el esquema viejo (score 0-100 + label de 6 valores)
//
// El rediseño V1 (sep-2026) reemplazó el porcentaje por veredicto + confianza.
// Las filas guardadas antes de ese cambio tienen `verdict` en NULL y siguen en la
// tabla: el historial de la gente no se tira. Se traducen al leerlas, nunca se
// reescriben en la DB — así el mapeo vive en un solo lugar y se puede corregir.
// ─────────────────────────────────────────────────────────────────────────────
const LEGACY_LABEL_TO_VERDICT = {
    verdadero: "verificado",
    mayormente_verdadero: "verificado",
    mixto: "dudoso",
    mayormente_falso: "falso",
    falso: "falso",
    no_verificable: "sin-datos",
};
/**
 * Confianza para una fila vieja: el mínimo válido de su veredicto. El esquema
 * anterior no medía la solidez de la evidencia (el score era "cuán verdadera es la
 * nota", no "cuánto lo sabemos"), así que inventar un nivel alto sería fingir un
 * dato que nunca se registró.
 */
const LEGACY_CONFIDENCE = {
    verificado: 3,
    dudoso: 2,
    falso: 3,
    "sin-datos": 1,
};
/** Titular neutro por veredicto, para filas viejas que no tienen uno escrito. */
const LEGACY_HEADLINE = {
    verificado: "Las fuentes consultadas respaldan la afirmación",
    dudoso: "La afirmación mezcla datos ciertos con otros sin respaldo",
    falso: "No encontramos respaldo para esta afirmación",
    "sin-datos": "No conseguimos evidencia suficiente para decidir",
};
const LEGACY_STANCE_TO_STANCE = {
    respalda: "confirma",
    contradice: "contradice",
    neutral_relacionada: "sin-datos",
};
/** "https://www.uio.no/algo" -> "uio.no". Duplicado chico a propósito: el repo no importa del módulo Gemini. */
function domainOf(url) {
    if (!url)
        return null;
    try {
        const host = new URL(url).hostname.toLowerCase();
        return host.startsWith("www.") ? host.slice(4) : host;
    }
    catch {
        return null;
    }
}
/**
 * Normaliza las fuentes de cualquiera de los dos esquemas al contrato actual.
 * Las viejas traen { title, url, stance: respalda|contradice|neutral_relacionada }
 * y les falta `domain`, que acá se deriva de la URL real.
 */
function mapSources(raw) {
    if (!Array.isArray(raw))
        return [];
    return raw
        .filter((s) => typeof s === "object" && s !== null)
        .map((s) => {
        const url = typeof s.url === "string" ? s.url : null;
        const title = typeof s.title === "string" ? s.title : "";
        const rawStance = typeof s.stance === "string" ? s.stance : "";
        const stance = rawStance === "confirma" ||
            rawStance === "contradice" ||
            rawStance === "sin-datos" ||
            rawStance === "origen"
            ? rawStance
            : LEGACY_STANCE_TO_STANCE[rawStance] ?? "sin-datos";
        return {
            // Si no hay dominio ni URL de donde sacarlo, queda vacío a propósito y NO
            // se rellena con el título: las fuentes del esquema viejo casi nunca
            // tenían link, y meter el título acá lo hacía ver como un dominio roto
            // (la fila lo muestra en mono). La card decide qué mostrar.
            domain: (typeof s.domain === "string" && s.domain.length > 0 ? s.domain : null) ??
                domainOf(url) ??
                "",
            title,
            url,
            stance,
            note: typeof s.note === "string" ? s.note : "",
        };
    });
}
// pg devuelve las columnas jsonb ya parseadas (sources/reasoning/tone_flags), no hace
// falta JSON.parse acá.
function mapAnalysisRow(row) {
    const esNueva = row.verdict !== null;
    const verdictBruto = esNueva
        ? row.verdict
        : LEGACY_LABEL_TO_VERDICT[row.label ?? ""] ?? "sin-datos";
    const confianzaBruta = esNueva
        ? (row.confidence ?? LEGACY_CONFIDENCE[verdictBruto])
        : LEGACY_CONFIDENCE[verdictBruto];
    // Una fila guardada antes de que existiera la regla dura (o editada a mano) puede
    // traer una combinación imposible: se degrada acá y no llega nunca al front.
    const { verdict, confidence } = (0, types_js_1.normalizeVerdict)(verdictBruto, confianzaBruta);
    // Ojo: la migración creó `reasoning` con DEFAULT '[]', así que una fila vieja
    // también trae un array (vacío) acá. Por eso el fallback se decide por `esNueva`
    // y no por la forma del campo: mirando el array, las filas viejas se quedaban
    // sin razonamiento en vez de mostrar lo que sí tenían guardado.
    const reasoning = esNueva && Array.isArray(row.reasoning)
        ? row.reasoning
        : // Fila vieja: lo más parecido a "pasos" que tenía eran estos dos textos sueltos.
            [row.explanation, row.claim_vs_evidence].filter((paso) => typeof paso === "string" && paso.trim().length > 0);
    return {
        id: row.id,
        url: row.url,
        title: row.title,
        scrapeMethod: row.scrape_method,
        verdict,
        confidence,
        headline: row.headline?.trim() || LEGACY_HEADLINE[verdict],
        lead: row.lead_text ?? row.claim_vs_evidence ?? row.explanation ?? "",
        summary: row.summary,
        reasoning,
        sources: mapSources(row.sources),
        toneFlags: Array.isArray(row.tone_flags) ? row.tone_flags : [],
        createdAt: row.created_at.toISOString(),
    };
}
/**
 * Trae el historial de análisis de un usuario, más recientes primero.
 *
 * A diferencia de saveAnalysis(), acá el error SÍ se propaga (no hay try/catch que
 * devuelva un valor por defecto): /history no tiene un fallback razonable si la DB
 * falla, es la única fuente del dato, así que quien llama (routes/history.ts) es
 * responsable de atajar la excepción y devolver el 500.
 */
async function getAnalysesByUserId(userId, limit, offset) {
    const pool = await (0, pool_js_1.getPool)();
    const result = await pool.query(`SELECT ${SELECT_COLUMNS}
     FROM analyses
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`, [userId, limit, offset]);
    return result.rows.map(mapAnalysisRow);
}
/**
 * Un análisis puntual por id, sin filtrar por dueño — a propósito.
 *
 * Es lo que hay detrás del botón "Compartir verificación": cualquiera con el
 * link (un uuid, no adivinable) tiene que poder abrir ese análisis sin cuenta.
 * Filtrar por usuario acá rompería justamente eso. El `UUID_PATTERN` corta antes
 * de la DB: sin él, un id basura hace fallar el cast a uuid y Postgres devuelve
 * un error en vez de un 404 limpio.
 *
 * El error se propaga (como en /history): la ruta decide qué responder.
 */
async function getAnalysisById(id) {
    if (!UUID_PATTERN.test(id))
        return null;
    const pool = await (0, pool_js_1.getPool)();
    const result = await pool.query(`SELECT ${SELECT_COLUMNS} FROM analyses WHERE id = $1`, [id]);
    const row = result.rows[0];
    return row ? mapAnalysisRow(row) : null;
}
/**
 * Caché de deduplicación de /analyze (ver routes/analyze.ts). Dos lookups por `url`
 * exacta (usa el índice `analyses_url_idx`), en el orden en que /analyze los necesita:
 *
 * 1. getAnalysisForUserByUrl(): ¿este mismo usuario ya tiene un análisis para esta URL?
 *    Si sí, se devuelve tal cual — no hace falta insertar de nuevo (ese es justamente el
 *    bug reportado: la misma noticia duplicándose en el propio historial).
 * 2. getLatestAnalysisByUrl(): ¿CUALQUIER usuario ya analizó esta URL? Si sí, /analyze
 *    reusa esos campos (sin scrapear ni llamar a Gemini de nuevo) y solo inserta una fila
 *    liviana para que le aparezca en su historial a quien la pidió.
 *
 * Ninguna de las dos alcanza noticias iguales con URL distinta a propósito: contenido
 * "igual" bajo otra URL (o de un sitio sin respaldo) se vuelve a analizar siempre.
 *
 * Igual que saveAnalysis(), no propagan errores: son parte de una optimización, no la
 * única fuente del dato como en /history, así que si la DB falla acá /analyze tiene que
 * poder seguir con el flujo normal (scrapear + analizar) en vez de romperse con un 500.
 */
async function getAnalysisForUserByUrl(userId, url) {
    try {
        const pool = await (0, pool_js_1.getPool)();
        const result = await pool.query(`SELECT ${SELECT_COLUMNS}
       FROM analyses
       WHERE user_id = $1 AND url = $2
       ORDER BY created_at DESC
       LIMIT 1`, [userId, url]);
        const row = result.rows[0];
        return row ? mapAnalysisRow(row) : null;
    }
    catch (err) {
        console.error("No se pudo buscar el análisis previo del usuario en la DB:", err instanceof Error ? err.message : err);
        return null;
    }
}
async function getLatestAnalysisByUrl(url) {
    try {
        const pool = await (0, pool_js_1.getPool)();
        const result = await pool.query(`SELECT ${SELECT_COLUMNS}
       FROM analyses
       WHERE url = $1
       ORDER BY created_at DESC
       LIMIT 1`, [url]);
        const row = result.rows[0];
        return row ? mapAnalysisRow(row) : null;
    }
    catch (err) {
        console.error("No se pudo buscar el análisis previo por URL en la DB:", err instanceof Error ? err.message : err);
        return null;
    }
}
/**
 * Totales globales: no filtra por usuario ni por fecha, son los números de la
 * plataforma entera y solo crecen a medida que se analizan noticias.
 *
 * El CASE traduce las filas viejas (verdict NULL, label de 6 valores) al vocabulario
 * actual, con el mismo mapeo que LEGACY_LABEL_TO_VERDICT — si cambia uno hay que
 * cambiar el otro. Se resuelve en SQL y no en JS para no traerse la tabla entera solo
 * para contar.
 *
 * Igual que getAnalysesByUserId(), el error se propaga: la ruta decide qué responder.
 */
async function getGlobalStats() {
    const pool = await (0, pool_js_1.getPool)();
    const result = await pool.query(`SELECT COALESCE(
              verdict,
              CASE label
                WHEN 'verdadero'            THEN 'verificado'
                WHEN 'mayormente_verdadero' THEN 'verificado'
                WHEN 'mixto'                THEN 'dudoso'
                WHEN 'mayormente_falso'     THEN 'falso'
                WHEN 'falso'                THEN 'falso'
                ELSE 'sin-datos'
              END
            )                                       AS verdict,
            COUNT(*)                                AS total,
            SUM(jsonb_array_length(sources))        AS sources,
            -- Las filas viejas no tienen confidence (el esquema anterior no medía
            -- la solidez de la evidencia). Se les asigna acá el mismo mínimo válido
            -- por veredicto que usa LEGACY_CONFIDENCE al leerlas — si cambia uno hay
            -- que cambiar el otro. Sin esto el promedio daba 0 mientras no hubiera
            -- ni un análisis nuevo.
            SUM(COALESCE(
              confidence,
              CASE label
                WHEN 'verdadero'            THEN 3
                WHEN 'mayormente_verdadero' THEN 3
                WHEN 'mixto'                THEN 2
                WHEN 'mayormente_falso'     THEN 3
                WHEN 'falso'                THEN 3
                ELSE 1
              END
            ))                                      AS confidence_sum,
            COUNT(*)                                AS confidence_count
     FROM analyses
     GROUP BY 1`);
    const verdicts = {
        verificado: 0,
        dudoso: 0,
        falso: 0,
        "sin-datos": 0,
    };
    let totalAnalyses = 0;
    let totalSources = 0;
    let confidenceSum = 0;
    let confidenceCount = 0;
    for (const row of result.rows) {
        // COUNT/SUM vuelven como string (bigint/numeric) desde pg.
        const total = Number(row.total);
        totalAnalyses += total;
        totalSources += Number(row.sources ?? 0);
        confidenceSum += Number(row.confidence_sum ?? 0);
        confidenceCount += Number(row.confidence_count);
        if (row.verdict in verdicts) {
            verdicts[row.verdict] += total;
        }
    }
    return {
        totalAnalyses,
        totalSources,
        averageConfidence: confidenceCount > 0 ? Math.round((confidenceSum / confidenceCount) * 10) / 10 : 0,
        verdicts,
    };
}
