-- Plan pago: la misma migración que migrate-plan.ts, en SQL puro, para el servidor de
-- producción (ahí no hay Node en el host y la imagen del backend no trae los scripts).
--
-- Cómo correrlo, desde el servidor, con el superusuario del contenedor de postgres:
--
--   docker ps                      (anotar el id del contenedor de postgres)
--   docker exec -i <id> psql -U postgres -d aletheia < migrate-plan.sql
--
-- Si la base no se llama "aletheia", usar la del DATABASE_URL del backend. Es re-corrible
-- y todo o nada: si un paso falla, no queda nada a medias.
--
-- Diferencia con migrate-plan.ts: no sabe con qué rol se conecta el backend en el
-- servidor, así que deja las tablas nuevas con el MISMO dueño que `users` (así el backend
-- las usa igual que las demás) y además da permisos a `aletheia_app` si ese rol existe.

\set ON_ERROR_STOP on

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
    RAISE EXCEPTION 'La base % no tiene la tabla users: ¿es la base correcta?', current_database();
  END IF;
END $$;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS plan              text NOT NULL DEFAULT 'gratuito',
  ADD COLUMN IF NOT EXISTS plan_desde        timestamptz,
  ADD COLUMN IF NOT EXISTS plan_hasta        timestamptz,
  ADD COLUMN IF NOT EXISTS mp_preapproval_id text;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_plan_chk;
ALTER TABLE users ADD CONSTRAINT users_plan_chk CHECK (plan IN ('gratuito', 'premium'));

CREATE TABLE IF NOT EXISTS uso_analisis (
  user_id  uuid    NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  ventana  text    NOT NULL CHECK (ventana IN ('dia', 'mes')),
  periodo  date    NOT NULL,
  analisis integer NOT NULL DEFAULT 0 CHECK (analisis >= 0),
  PRIMARY KEY (user_id, ventana, periodo)
);

CREATE TABLE IF NOT EXISTS solicitudes_plan (
  id                uuid PRIMARY KEY,
  user_id           uuid,
  email             text,
  tipo              text NOT NULL CHECK (tipo IN ('baja', 'arrepentimiento')),
  estado            text NOT NULL CHECK (estado IN ('resuelta', 'pendiente')),
  mp_preapproval_id text,
  detalle           text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

DO $$
DECLARE
  duenio text := (SELECT tableowner FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users');
BEGIN
  EXECUTE format('ALTER TABLE uso_analisis OWNER TO %I', duenio);
  EXECUTE format('ALTER TABLE solicitudes_plan OWNER TO %I', duenio);
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'aletheia_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.uso_analisis TO aletheia_app;
    GRANT SELECT, INSERT ON public.solicitudes_plan TO aletheia_app;
  END IF;
END $$;

ALTER TABLE uso_analisis ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitudes_plan ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS uso_analisis_select_own ON uso_analisis;
CREATE POLICY uso_analisis_select_own ON uso_analisis
  FOR SELECT USING (user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid);
DROP POLICY IF EXISTS uso_analisis_insert_own ON uso_analisis;
CREATE POLICY uso_analisis_insert_own ON uso_analisis
  FOR INSERT WITH CHECK (user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid);
DROP POLICY IF EXISTS uso_analisis_update_own ON uso_analisis;
CREATE POLICY uso_analisis_update_own ON uso_analisis
  FOR UPDATE USING (user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid)
  WITH CHECK (user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid);
DROP POLICY IF EXISTS uso_analisis_delete_own ON uso_analisis;
CREATE POLICY uso_analisis_delete_own ON uso_analisis
  FOR DELETE USING (user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid);

DROP POLICY IF EXISTS solicitudes_plan_select_own ON solicitudes_plan;
CREATE POLICY solicitudes_plan_select_own ON solicitudes_plan
  FOR SELECT USING (user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid);
DROP POLICY IF EXISTS solicitudes_plan_insert ON solicitudes_plan;
CREATE POLICY solicitudes_plan_insert ON solicitudes_plan
  FOR INSERT WITH CHECK (
    user_id IS NULL OR user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
  );

COMMIT;

-- Cómo quedó: tienen que aparecer las 4 columnas y las 2 tablas.
SELECT column_name FROM information_schema.columns
 WHERE table_schema = 'public' AND table_name = 'users'
   AND column_name IN ('plan', 'plan_desde', 'plan_hasta', 'mp_preapproval_id');
SELECT tablename, tableowner FROM pg_tables WHERE tablename IN ('users', 'uso_analisis', 'solicitudes_plan');
