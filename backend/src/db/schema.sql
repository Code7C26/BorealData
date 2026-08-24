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
