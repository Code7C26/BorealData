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
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- FK de analyses.user_id -> users.id. Si ya corriste este schema.sql antes de esta
-- fecha, la tabla `analyses` ya existe sin esta constraint: correla a mano.
-- (No hay "ADD CONSTRAINT IF NOT EXISTS" en Postgres; si ya la corriste una vez y la
-- volvés a correr, va a tirar error de "constraint already exists" — ignorable.)
ALTER TABLE analyses
  ADD CONSTRAINT analyses_user_id_fkey FOREIGN KEY (user_id) REFERENCES users (id);
