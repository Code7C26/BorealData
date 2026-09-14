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

-- ── Row Level Security (13-sep-2026) ────────────────────────────────────────
-- Objetivo: que cada usuario solo pueda leer/escribir sus propias filas, incluso si
-- algún día un endpoint nuevo se olvida del WHERE user_id = ... — RLS es la segunda
-- capa, no reemplaza el filtro que ya hace cada función de db/analysesRepository.ts
-- y db/usersRepository.ts.
--
-- Importante: Postgres IGNORA las policies de RLS para el dueño de la tabla (y para
-- superusuarios), salvo que se use FORCE ROW LEVEL SECURITY. Acá NO se usa FORCE a
-- propósito: se crea un rol de aplicación aparte, sin ser dueño de las tablas, y es
-- ESE rol el que el backend tiene que usar (DB_USER) para que RLS aplique de verdad.
-- El dueño original (el rol con el que se corrió este schema.sql) sigue sin
-- restricciones, para poder hacer consultas de mantenimiento sin pelearte con las
-- policies.
--
-- Password: cambiar el placeholder de abajo antes de correr esto, y usar esa misma
-- contraseña como DB_PASSWORD del backend (nunca commitear la contraseña real a git —
-- va en el .env local o en las variables de entorno del deploy, ambos gitignoreados).
CREATE ROLE aletheia_app WITH LOGIN PASSWORD 'CAMBIAR_ESTA_PASSWORD';
GRANT USAGE ON SCHEMA public TO aletheia_app;
GRANT SELECT, INSERT, UPDATE ON public.analyses, public.users TO aletheia_app;
-- Sin DELETE ni DDL: el backend nunca borra filas ni cambia el esquema en runtime.

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;

-- `users`: cada quien solo ve/crea/actualiza su propia fila, identificada por
-- firebase_uid (el uid del token verificado por Firebase Admin en el backend — ver
-- auth/verifyAuth.ts; el cliente nunca puede mandar un firebase_uid falso porque no
-- sale del token, sale de verifyIdToken()). Backend la setea en cada transacción con
-- set_config('app.current_firebase_uid', ...) — ver db/context.ts.
CREATE POLICY users_select_own ON users
  FOR SELECT
  USING (firebase_uid = current_setting('app.current_firebase_uid', true));

CREATE POLICY users_insert_own ON users
  FOR INSERT
  WITH CHECK (firebase_uid = current_setting('app.current_firebase_uid', true));

CREATE POLICY users_update_own ON users
  FOR UPDATE
  USING (firebase_uid = current_setting('app.current_firebase_uid', true))
  WITH CHECK (firebase_uid = current_setting('app.current_firebase_uid', true));

-- `analyses`: por defecto cada quien solo ve/inserta filas con su propio user_id (uuid
-- interno, no el uid de Firebase — ver db/context.ts::runInUserTransaction). El
-- NULLIF+cast evita que current_setting(...) devuelva '' (contexto no seteado, ej. una
-- request sin login) y reviente el cast a uuid: en ese caso user_id = NULL nunca
-- matchea ninguna fila real, así que el efecto es "denegar", no un error.
--
-- La condición `OR current_setting('app.bypass_owner_check', true) = 'true'` es la
-- excepción a propósito para los dos casos de lectura cruzada entre usuarios que ya
-- existían ANTES de este RLS (no es un agujero nuevo, es preservar el comportamiento
-- actual): el link público "Compartir resultado" (GET /analyses/:id, sin login) y la
-- caché de /analyze que reusa el análisis de cualquier usuario para la misma URL en
-- vez de gastar Gemini de nuevo. También la usa el agregado público de GET /stats
-- (cuenta/promedia TODAS las filas, no las de un usuario). El backend solo prende ese
-- flag alrededor de esas queries puntuales — ver getAnalysisById, getLatestAnalysisByUrl
-- y getGlobalStats en db/analysesRepository.ts.
CREATE POLICY analyses_select_own_or_shared ON analyses
  FOR SELECT
  USING (
    user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
    OR current_setting('app.bypass_owner_check', true) = 'true'
  );

-- El INSERT nunca necesita el bypass: cada fila que el backend inserta representa el
-- análisis TAL COMO LE QUEDA al usuario actual (aunque el contenido se haya reusado de
-- otro usuario, la fila nueva es de quien la pidió). user_id IS NULL cubre el caso
-- borde de que upsertUser() haya fallado (ver saveAnalysis en analysesRepository.ts) —
-- no es un hueco de seguridad: nadie puede leer esa fila después salvo por el link
-- público (bypass) o si en el futuro se le asigna un dueño.
CREATE POLICY analyses_insert_own ON analyses
  FOR INSERT
  WITH CHECK (
    user_id IS NULL
    OR user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
  );

-- Sin policies de UPDATE/DELETE a propósito: con RLS activado, la ausencia de policy
-- para un comando lo deniega por completo para aletheia_app — correcto, el backend
-- nunca actualiza ni borra filas de `analyses`.
