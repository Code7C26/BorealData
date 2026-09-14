-- Correr una sola vez contra la instancia de Cloud SQL (psql, Cloud SQL Studio en la
-- consola de GCP, o Cloud Shell) para crear la tabla. No hay herramienta de migraciones:
-- es una sola tabla, se ejecuta a mano.

CREATE TABLE IF NOT EXISTS analyses (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url               text NOT NULL,
  title             text,
  scrape_method     text,
  score             integer NOT NULL,
  label             text NOT NULL,
  summary           text,
  explanation       text,
  claim_vs_evidence text,
  sources           jsonb NOT NULL DEFAULT '[]',
  tone_flags        jsonb NOT NULL DEFAULT '[]',
  user_id           uuid, -- se completa cuando exista JWT/Firebase Auth; nullable por ahora
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS analyses_created_at_idx ON analyses (created_at DESC);

-- ── Firebase Auth (ago-2026) ────────────────────────────────────────────────
-- Tabla `users`: id interno (uuid) propio de la app, separado del uid de Firebase.
-- `firebase_uid` es el `decodedToken.uid` que devuelve verifyIdToken() en el backend
-- (ver src/auth/verifyAuth.ts) — es un string, NO un uuid, por eso va en columna `text`
-- con UNIQUE en vez de ser directamente la PK. Se puebla vía upsert en cada request
-- autenticado (ver src/db/usersRepository.ts::upsertUser), no hace falta un paso de
-- "registro" aparte: la primera vez que un uid de Firebase pega contra el backend, se
-- crea su fila acá.
CREATE TABLE IF NOT EXISTS users (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid text NOT NULL UNIQUE,
  email        text,
  full_name    text, -- nombre y apellido juntos, un solo campo (31-ago-2026). Nullable:
                      -- se completa recién cuando el usuario pasa por POST /me (después
                      -- del registro/login), no en el upsert automático de /analyze o
                      -- /history, que solo conocen uid/email.
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- FK de analyses.user_id -> users.id. Si ya corriste este schema.sql antes de esta
-- fecha, la tabla `analyses` ya existe sin esta constraint: correla a mano.
-- (No hay "ADD CONSTRAINT IF NOT EXISTS" en Postgres; si ya la corriste una vez y la
-- volvés a correr, va a tirar error de "constraint already exists" — ignorable.)
ALTER TABLE analyses
  ADD CONSTRAINT analyses_user_id_fkey FOREIGN KEY (user_id) REFERENCES users (id);

-- Columna `full_name` (31-ago-2026): si ya tenías `users` creada de antes (como en el
-- Postgres local de Ciro), correr esto una vez para agregarla. `ADD COLUMN IF NOT EXISTS`
-- sí existe en Postgres (a diferencia de ADD CONSTRAINT), así que es seguro re-correrlo.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS full_name text;

-- ── Caché de análisis por URL (10-sep-2026) ─────────────────────────────────
-- POST /analyze busca por `url` exacta antes de scrapear/llamar a Gemini (ver
-- analysesRepository.ts::getLatestAnalysisByUrl y routes/analyze.ts). Índice no-único:
-- se sigue guardando una fila por cada usuario que pide una URL ya analizada (para que
-- le aparezca en su propio /history), pero sin repetir el scrape ni el llamado a Gemini.
CREATE INDEX IF NOT EXISTS analyses_url_idx ON analyses (url);

-- Limpieza única (10-sep-2026): antes del caché de arriba, cada re-análisis de una URL ya
-- vista insertaba una fila nueva — quien probó la app varias veces con la misma noticia
-- terminó con esa noticia repetida en su /historial y en "Recientes" del sidebar. Este
-- DELETE deja una sola fila por (usuario, URL) —la más reciente de cada grupo—, igual que
-- de ahora en más hace getAnalysisForUserByUrl() en cada request nueva. Correr una sola
-- vez; si se re-corre no hace nada (ya no quedan duplicados que borrar).
DELETE FROM analyses a
USING analyses b
WHERE a.url = b.url
  AND a.user_id IS NOT DISTINCT FROM b.user_id
  AND (a.created_at < b.created_at
       OR (a.created_at = b.created_at AND a.id < b.id));

-- ── Rediseño V1: veredicto + confianza (11-sep-2026) ────────────────────────
-- El porcentaje de veracidad (`score`, 0-100) se eliminó del producto: fingía una
-- precisión decimal que el análisis no tiene. Lo reemplazan dos campos:
--   `verdict`     una de cuatro etiquetas cerradas (verificado/dudoso/falso/sin-datos)
--   `confidence`  qué tan sólida es la evidencia, en cinco escalones (1 a 5)
-- más el titular en lenguaje natural (`headline` + `lead_text`) y los pasos del
-- razonamiento (`reasoning`), que antes no se guardaban.
--
-- Las columnas viejas (score, label, explanation, claim_vs_evidence) NO se borran y
-- `score` pasa a ser nullable: las filas anteriores al rediseño siguen en la tabla y se
-- traducen al leerlas (ver analysesRepository.ts::mapAnalysisRow). Borrarlas tiraría el
-- historial de todos los usuarios. `label` también pierde el NOT NULL por lo mismo: las
-- filas nuevas no lo escriben.
--
-- Todo es ADD COLUMN IF NOT EXISTS / ALTER COLUMN, así que se puede re-correr sin daño.
ALTER TABLE analyses
  ADD COLUMN IF NOT EXISTS verdict    text,
  ADD COLUMN IF NOT EXISTS confidence smallint,
  ADD COLUMN IF NOT EXISTS headline   text,
  ADD COLUMN IF NOT EXISTS lead_text  text,
  ADD COLUMN IF NOT EXISTS reasoning  jsonb NOT NULL DEFAULT '[]';

ALTER TABLE analyses ALTER COLUMN score DROP NOT NULL;
ALTER TABLE analyses ALTER COLUMN label DROP NOT NULL;

-- La regla dura del sistema, también en la DB: sin-datos nunca supera el nivel 2 y
-- falso/verificado nunca bajan de 3. Si el motor devuelve una combinación fuera de tabla,
-- el backend ya la degrada a sin-datos antes de insertar (normalizeVerdict en
-- gemini/types.ts); esta constraint es la red por si alguien escribe a mano.
-- (No hay ADD CONSTRAINT IF NOT EXISTS en Postgres: si ya la corriste, el error de
-- "constraint already exists" es ignorable.)
ALTER TABLE analyses
  ADD CONSTRAINT analyses_verdict_confidence_chk CHECK (
    verdict IS NULL
    OR (verdict = 'verificado' AND confidence BETWEEN 3 AND 5)
    OR (verdict = 'falso'      AND confidence BETWEEN 3 AND 5)
    OR (verdict = 'dudoso'     AND confidence BETWEEN 2 AND 4)
    OR (verdict = 'sin-datos'  AND confidence BETWEEN 1 AND 2)
  );
