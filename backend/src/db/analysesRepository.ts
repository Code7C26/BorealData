import { runInUserTransaction } from "./context.js";
import {
  DEFAULT_LANGUAGE,
  normalizeVerdict,
  parseLanguage,
  type AnalysisResult,
  type AnalysisSource,
  type Confidence,
  type Language,
  type SourceStance,
  type Verdict,
} from "../gemini/types.js";

/**
 * De dónde salió un análisis (columna `source_type`, ver schema.sql). 'url' es el camino
 * clásico (scraper); el resto es contenido que armó el cliente dentro de la pestaña de la
 * persona (POST /analyze/content) y puede ser PRIVADO: nunca entra a la caché por URL ni al
 * link público de "Compartir resultado".
 */
export type SourceType = "url" | "capture" | "selection" | "image" | "text";

/** Campos de una fila de `analyses`, sin id/user_id/created_at (lo que hace falta para insertarla). */
interface AnalysisRowFields {
  url: string;
  title: string | null;
  scrapeMethod: string | null;
  verdict: Verdict;
  confidence: Confidence;
  headline: string;
  lead: string;
  summary: string | null;
  reasoning: string[];
  sources: AnalysisSource[];
  toneFlags: string[];
  /** Default 'url'. Solo lo informa saveAnalysis(): saveReusedAnalysis() copia siempre filas 'url'. */
  sourceType?: SourceType;
  capturePlatform?: string | null;
  /** Idioma en que escribió Gemini (columna `language`). Default 'es'. */
  language?: Language;
}

/** Un uuid v4 tal como lo genera `gen_random_uuid()`. Cualquier otra cosa ni toca la DB. */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * INSERT compartido por saveAnalysis() y saveReusedAnalysis() — mismo try/catch
 * best-effort. Devuelve el id de la fila nueva (el que va en el link público de
 * /resultado/:id, ver getAnalysisById() más abajo), o null si el guardado falló.
 */
async function insertAnalysisRow(
  fields: AnalysisRowFields,
  userId: string | null
): Promise<string | null> {
  try {
    return await runInUserTransaction({ currentUserId: userId }, async (client) => {
      const result = await client.query<{ id: string }>(
        `INSERT INTO analyses
          (url, title, scrape_method, verdict, confidence, headline, lead_text,
           summary, reasoning, sources, tone_flags, user_id,
           source_type, capture_platform, language)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
         RETURNING id`,
        [
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
          fields.sourceType ?? "url",
          fields.capturePlatform ?? null,
          fields.language ?? "es",
        ]
      );
      return result.rows[0]?.id ?? null;
    });
  } catch (err) {
    console.error(
      "No se pudo guardar el análisis en la DB:",
      err instanceof Error ? err.message : err
    );
    return null;
  }
}

/** Origen del análisis que se guarda. Sin `meta`, es un análisis de URL (el camino de siempre). */
export interface SaveAnalysisMeta {
  sourceType?: SourceType;
  capturePlatform?: string | null;
  language?: Language;
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
export async function saveAnalysis(
  // `method` es string (no el union del scraper) para que un contenido del cliente pueda
  // guardarse como "capture" sin pasar por el scraper.
  scraped: { url: string; title: string | null; method: string },
  analysis: AnalysisResult,
  userId: string | null = null,
  meta: SaveAnalysisMeta = {}
): Promise<string | null> {
  return insertAnalysisRow(
    {
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
      sourceType: meta.sourceType ?? "url",
      capturePlatform: meta.capturePlatform ?? null,
      language: meta.language ?? "es",
    },
    userId
  );
}

/**
 * Guarda una fila de historial para `userId` reutilizando un análisis ya hecho (por este
 * mismo usuario u otro) para la misma URL — sin volver a scrapear ni llamar a Gemini. Ver
 * getLatestAnalysisByUrl() y su uso en routes/analyze.ts.
 *
 * `language` es el idioma con el que se buscó `cached` (la caché matchea por url + idioma),
 * así que la fila nueva queda en ese mismo idioma.
 */
export async function saveReusedAnalysis(
  cached: AnalysisHistoryItem,
  userId: string | null,
  language: Language
): Promise<string | null> {
  return insertAnalysisRow({ ...cached, language }, userId);
}

/** Forma de un análisis tal como lo devuelve GET /history (misma forma que la respuesta 200 de /analyze, más `id` y `createdAt`). */
export interface AnalysisHistoryItem {
  id: string;
  url: string;
  title: string | null;
  scrapeMethod: string | null;
  verdict: Verdict;
  confidence: Confidence;
  headline: string;
  lead: string;
  summary: string | null;
  reasoning: string[];
  sources: AnalysisSource[];
  toneFlags: string[];
  createdAt: string;
  /** De dónde salió. Las filas anteriores a la migración son 'url'. */
  sourceType: SourceType;
  /**
   * false para contenido que armó el cliente (puede ser privado): el front no debe ofrecer
   * "Compartir resultado", y GET /analyses/:id solo se lo sirve a su dueño.
   */
  shareable: boolean;
  /**
   * Idioma en que escribió Gemini. El front lo usa para avisar cuando un análisis está en
   * otro idioma que la interfaz (los guardados antes de oct-2026 son todos 'es').
   */
  language: Language;
}

interface AnalysisRow {
  id: string;
  url: string;
  title: string | null;
  scrape_method: string | null;
  verdict: string | null;
  confidence: number | null;
  headline: string | null;
  lead_text: string | null;
  summary: string | null;
  reasoning: string[] | null;
  sources: unknown[] | null;
  tone_flags: string[] | null;
  created_at: Date;
  source_type: string | null;
  language: string | null;
  // ── Columnas del esquema viejo, solo para las filas anteriores al rediseño ──
  score: number | null;
  label: string | null;
  explanation: string | null;
  claim_vs_evidence: string | null;
}

/**
 * Las columnas que hace falta leer en todas las queries (nuevas + legacy).
 *
 * `language` necesita migrate-language.ts corrido: sin la columna, todas las lecturas
 * fallan y el historial se ve vacío (los repos atrapan el error). El INSERT ya la
 * necesitaba, así que no agrega un requisito nuevo, solo lo hace visible antes.
 */
const SELECT_COLUMNS = `id, url, title, scrape_method, verdict, confidence, headline,
            lead_text, summary, reasoning, sources, tone_flags, created_at,
            source_type, language, score, label, explanation, claim_vs_evidence`;

// ─────────────────────────────────────────────────────────────────────────────
// Compatibilidad con el esquema viejo (score 0-100 + label de 6 valores)
//
// El rediseño V1 (sep-2026) reemplazó el porcentaje por veredicto + confianza.
// Las filas guardadas antes de ese cambio tienen `verdict` en NULL y siguen en la
// tabla: el historial de la gente no se tira. Se traducen al leerlas, nunca se
// reescriben en la DB — así el mapeo vive en un solo lugar y se puede corregir.
// ─────────────────────────────────────────────────────────────────────────────

const LEGACY_LABEL_TO_VERDICT: Record<string, Verdict> = {
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
const LEGACY_CONFIDENCE: Record<Verdict, Confidence> = {
  verificado: 3,
  dudoso: 2,
  falso: 3,
  "sin-datos": 1,
};

/** Titular neutro por veredicto, para filas viejas que no tienen uno escrito. */
const LEGACY_HEADLINE: Record<Verdict, string> = {
  verificado: "Las fuentes consultadas respaldan la afirmación",
  dudoso: "La afirmación mezcla datos ciertos con otros sin respaldo",
  falso: "No encontramos respaldo para esta afirmación",
  "sin-datos": "No conseguimos evidencia suficiente para decidir",
};

const LEGACY_STANCE_TO_STANCE: Record<string, SourceStance> = {
  respalda: "confirma",
  contradice: "contradice",
  neutral_relacionada: "sin-datos",
};

/**
 * El host del redirect de atribución de Google. Los links que devuelve la búsqueda de
 * Gemini son todos `https://vertexaisearch.cloud.google.com/grounding-api-redirect/<token>`,
 * así que derivar el dominio de la URL de una fuente da SIEMPRE este host y nunca el medio.
 */
const REDIRECT_HOST = "vertexaisearch.cloud.google.com";

/** ¿Este "dominio" es en realidad el host del redirect de Google y no un medio? */
function esDominioDeRedireccion(domain: string): boolean {
  return domain.toLowerCase().endsWith(REDIRECT_HOST);
}

/**
 * "https://www.uio.no/algo" -> "uio.no". Duplicado chico a propósito: el repo no importa
 * del módulo Gemini.
 *
 * Devuelve null para los links de redirección: hasta el 8-oct-2026 el dominio se guardaba
 * derivado de la URL, así que todas las filas viejas tienen `domain` =
 * "vertexaisearch.cloud.google.com" (medido: 430 de 430 fuentes en la base local). Esas
 * filas no se tocan —se traducen al leerlas, como el resto del esquema viejo— y devolver
 * null acá hace que la card muestre el título de la fuente en vez de un host de Google
 * que no le dice nada a nadie. El link sigue funcionando: el redirect lleva al medio.
 */
function domainOf(url: string | null): string | null {
  if (!url) return null;
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (esDominioDeRedireccion(host)) return null;
    return host.startsWith("www.") ? host.slice(4) : host;
  } catch {
    return null;
  }
}

/**
 * Normaliza las fuentes de cualquiera de los dos esquemas al contrato actual.
 * Las viejas traen { title, url, stance: respalda|contradice|neutral_relacionada }
 * y les falta `domain`, que acá se deriva de la URL real.
 */
function mapSources(raw: unknown[] | null): AnalysisSource[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .filter((s): s is Record<string, unknown> => typeof s === "object" && s !== null)
    .map((s) => {
      const url = typeof s.url === "string" ? s.url : null;
      const title = typeof s.title === "string" ? s.title : "";
      const rawStance = typeof s.stance === "string" ? s.stance : "";
      const stance: SourceStance =
        rawStance === "confirma" ||
        rawStance === "contradice" ||
        rawStance === "sin-datos" ||
        rawStance === "origen"
          ? rawStance
          : LEGACY_STANCE_TO_STANCE[rawStance] ?? "sin-datos";

      const storedDomain = typeof s.domain === "string" ? s.domain : "";

      return {
        // Si no hay dominio ni URL de donde sacarlo, queda vacío a propósito y NO
        // se rellena con el título: las fuentes del esquema viejo casi nunca
        // tenían link, y meter el título acá lo hacía ver como un dominio roto
        // (la fila lo muestra en mono). La card decide qué mostrar.
        domain:
          (storedDomain.length > 0 && !esDominioDeRedireccion(storedDomain)
            ? storedDomain
            : null) ??
          domainOf(url) ??
          "",
        title,
        url,
        stance,
        note: typeof s.note === "string" ? s.note : "",
      };
    });
}

const SOURCE_TYPES: readonly string[] = ["url", "capture", "selection", "image", "text"];

function isSourceType(value: string | null): value is SourceType {
  return value !== null && SOURCE_TYPES.includes(value);
}

// pg devuelve las columnas jsonb ya parseadas (sources/reasoning/tone_flags), no hace
// falta JSON.parse acá.
function mapAnalysisRow(row: AnalysisRow): AnalysisHistoryItem {
  const esNueva = row.verdict !== null;

  const verdictBruto: Verdict = esNueva
    ? (row.verdict as Verdict)
    : LEGACY_LABEL_TO_VERDICT[row.label ?? ""] ?? "sin-datos";

  const confianzaBruta: Confidence = esNueva
    ? ((row.confidence ?? LEGACY_CONFIDENCE[verdictBruto]) as Confidence)
    : LEGACY_CONFIDENCE[verdictBruto];

  // Una fila guardada antes de que existiera la regla dura (o editada a mano) puede
  // traer una combinación imposible: se degrada acá y no llega nunca al front.
  const { verdict, confidence } = normalizeVerdict(verdictBruto, confianzaBruta);

  // Ojo: la migración creó `reasoning` con DEFAULT '[]', así que una fila vieja
  // también trae un array (vacío) acá. Por eso el fallback se decide por `esNueva`
  // y no por la forma del campo: mirando el array, las filas viejas se quedaban
  // sin razonamiento en vez de mostrar lo que sí tenían guardado.
  const reasoning =
    esNueva && Array.isArray(row.reasoning)
      ? row.reasoning
      : // Fila vieja: lo más parecido a "pasos" que tenía eran estos dos textos sueltos.
        [row.explanation, row.claim_vs_evidence].filter(
          (paso): paso is string => typeof paso === "string" && paso.trim().length > 0
        );

  const sourceType: SourceType = isSourceType(row.source_type) ? row.source_type : "url";

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
    sourceType,
    shareable: sourceType === "url",
    language: parseLanguage(row.language) ?? DEFAULT_LANGUAGE,
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
export async function getAnalysesByUserId(
  userId: string,
  limit: number,
  offset: number
): Promise<AnalysisHistoryItem[]> {
  return runInUserTransaction({ currentUserId: userId }, async (client) => {
    const result = await client.query<AnalysisRow>(
      `SELECT ${SELECT_COLUMNS}
       FROM analyses
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    return result.rows.map(mapAnalysisRow);
  });
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
 *
 * `viewerUserId` (opcional): id interno del usuario logueado que abre el link, para que el
 * dueño de una captura pueda abrir la suya. Ver routes/analyses.ts.
 */
export async function getAnalysisById(
  id: string,
  viewerUserId: string | null = null
): Promise<AnalysisHistoryItem | null> {
  if (!UUID_PATTERN.test(id)) return null;

  // El bypass del link público solo alcanza a filas 'url' (policy analyses_select_own_or_shared
  // en schema.sql). El contenido del cliente (capturas, selecciones, texto pegado) puede ser
  // privado: se lo sirve únicamente a su dueño, por eso acá se pasa también el usuario que mira
  // (id interno, no el uid de Firebase) cuando hay sesión. Sin sesión, una captura da null.
  return runInUserTransaction({ bypassOwnerCheck: true, currentUserId: viewerUserId }, async (client) => {
    // Filtro EXPLÍCITO además de la policy de RLS: RLS no se aplica al dueño de la tabla ni a
    // superusuarios (típico en desarrollo local, donde DATABASE_URL usa `postgres`), y ahí el
    // link público serviría capturas privadas. Una fila que no es 'url' solo la ve su dueño.
    const result = await client.query<AnalysisRow>(
      `SELECT ${SELECT_COLUMNS}
       FROM analyses
       WHERE id = $1
         AND (source_type = 'url' OR user_id = $2::uuid)`,
      [id, viewerUserId]
    );

    const row = result.rows[0];
    return row ? mapAnalysisRow(row) : null;
  });
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
 *
 * Idioma (oct-2026): las dos matchean por (url, language). El análisis es texto que
 * escribió Gemini en un idioma; sin este filtro, quien usa la web en inglés recibiría el
 * análisis en castellano que pidió otra persona (o él mismo antes de cambiar el idioma).
 * Una misma URL puede tener entonces una fila por idioma en el historial: es a propósito.
 */
// IMPORTANTE (contenido del cliente): las dos búsquedas filtran `source_type = 'url'`. Una
// captura guarda como `url` la página donde estaba (instagram.com/, facebook.com/...), que es
// la MISMA para posteos distintos: sin el filtro, esta caché le serviría a la persona (o a
// otra) el análisis de OTRO posteo, y en el caso compartido filtraría un posteo privado.
export async function getAnalysisForUserByUrl(
  userId: string,
  url: string,
  language: Language
): Promise<AnalysisHistoryItem | null> {
  try {
    return await runInUserTransaction({ currentUserId: userId }, async (client) => {
      const result = await client.query<AnalysisRow>(
        `SELECT ${SELECT_COLUMNS}
         FROM analyses
         WHERE user_id = $1 AND url = $2 AND source_type = 'url' AND language = $3
         ORDER BY created_at DESC
         LIMIT 1`,
        [userId, url, language]
      );

      const row = result.rows[0];
      return row ? mapAnalysisRow(row) : null;
    });
  } catch (err) {
    console.error(
      "No se pudo buscar el análisis previo del usuario en la DB:",
      err instanceof Error ? err.message : err
    );
    return null;
  }
}

/**
 * bypassOwnerCheck: true a propósito (ver policy analyses_select_own_or_shared en
 * schema.sql) — esta búsqueda es la caché de /analyze que reusa el análisis de
 * CUALQUIER usuario para la misma URL, para no gastar otra llamada a Gemini.
 */
export async function getLatestAnalysisByUrl(
  url: string,
  language: Language
): Promise<AnalysisHistoryItem | null> {
  try {
    return await runInUserTransaction({ bypassOwnerCheck: true }, async (client) => {
      const result = await client.query<AnalysisRow>(
        `SELECT ${SELECT_COLUMNS}
         FROM analyses
         WHERE url = $1 AND source_type = 'url' AND language = $2
         ORDER BY created_at DESC
         LIMIT 1`,
        [url, language]
      );

      const row = result.rows[0];
      return row ? mapAnalysisRow(row) : null;
    });
  } catch (err) {
    console.error(
      "No se pudo buscar el análisis previo por URL en la DB:",
      err instanceof Error ? err.message : err
    );
    return null;
  }
}

/** Totales acumulados de toda la plataforma (los devuelve GET /stats). */
export interface GlobalStats {
  /** Cantidad de análisis guardados, de todos los usuarios, desde siempre. */
  totalAnalyses: number;
  /** Suma de fuentes citadas en todos los análisis (cuenta repeticiones entre análisis). */
  totalSources: number;
  /**
   * Promedio del nivel de confianza (1 a 5) con un decimal. 0 si todavía no hay análisis.
   * Reemplaza al viejo `averageScore` en porcentaje: el porcentaje dejó de existir en el
   * rediseño V1 y un "78 % de confiabilidad promedio" ya no significaba nada.
   */
  averageConfidence: number;
  /** Cuántos análisis cayeron en cada veredicto. */
  verdicts: Record<Verdict, number>;
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
 * Solo cuenta análisis de URL (`source_type = 'url'`): el contenido del cliente puede ser
 * privado y no entra al agregado público. La policy de RLS ya lo garantiza para el rol de la
 * app; el filtro explícito lo hace valer también para quien corra esto como dueño/superusuario.
 *
 * Igual que getAnalysesByUserId(), el error se propaga: la ruta decide qué responder.
 */
export async function getGlobalStats(): Promise<GlobalStats> {
  return runInUserTransaction({ bypassOwnerCheck: true }, async (client) => {
    const result = await client.query<{
      verdict: string;
      total: string;
      sources: string | null;
      confidence_sum: string | null;
      confidence_count: string;
    }>(
      `SELECT COALESCE(
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
       WHERE source_type = 'url'
       GROUP BY 1`
    );

    const verdicts: Record<Verdict, number> = {
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
        verdicts[row.verdict as Verdict] += total;
      }
    }

    return {
      totalAnalyses,
      totalSources,
      averageConfidence:
        confidenceCount > 0 ? Math.round((confidenceSum / confidenceCount) * 10) / 10 : 0,
      verdicts,
    };
  });
}
/**
 * Código de error de Postgres cuando al rol le falta un permiso (insufficient_privilege).
 * Pasa si todavía no corrió `migrate-delete.ts`: el rol de la app arranca con
 * SELECT/INSERT/UPDATE y sin DELETE. Se distingue a propósito de cualquier otro fallo
 * para poder responder "falta correr la migración" en vez de un 500 sin explicación —
 * es el modo de falla que ya nos costó una tarde de debug del front.
 */
export const SIN_PERMISO_DELETE = "42501";

/** true si el error de pg es "a este rol le falta el permiso". */
export function esFaltaDePermiso(err: unknown): boolean {
  return (err as { code?: string } | null)?.code === SIN_PERMISO_DELETE;
}

/**
 * Borra UN análisis del usuario, si es suyo.
 *
 * No se pasa `bypassOwnerCheck`: el bypass existe solo para leer (link público y caché
 * por URL). Acá la policy analyses_delete_own filtra por `user_id`, así que un id de otra
 * persona simplemente no borra nada y devuelve false — no hay forma de distinguir "no es
 * tuyo" de "no existe", que además es la respuesta correcta para no filtrar qué ids
 * existen.
 */
export async function deleteAnalysisForUser(id: string, userId: string): Promise<boolean> {
  if (!UUID_PATTERN.test(id)) return false;

  return runInUserTransaction({ currentUserId: userId }, async (client) => {
    const result = await client.query(`DELETE FROM analyses WHERE id = $1 AND user_id = $2`, [
      id,
      userId,
    ]);
    return (result.rowCount ?? 0) > 0;
  });
}

/** Borra TODOS los análisis del usuario. Devuelve cuántos borró. */
export async function deleteAllAnalysesForUser(userId: string): Promise<number> {
  return runInUserTransaction({ currentUserId: userId }, async (client) => {
    const result = await client.query(`DELETE FROM analyses WHERE user_id = $1`, [userId]);
    return result.rowCount ?? 0;
  });
}
