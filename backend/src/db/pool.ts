import { Connector, IpAddressTypes } from "@google-cloud/cloud-sql-connector";
import pg from "pg";

let pool: pg.Pool | null = null;

/**
 * Crea (o reutiliza) el pool de conexiones de forma perezosa, para no romper el
 * arranque del server si las env vars de DB todavía no están seteadas (mismo patrón
 * que getClient() en geminiClient.ts).
 *
 * Dos modos, elegidos automáticamente según lo que haya en el .env:
 *
 * MODO LOCAL (desarrollo, 26-ago-2026): si existe `DATABASE_URL`, se conecta directo
 * a un Postgres local (`pg.Pool({ connectionString })`) — sin Cloud SQL Connector, sin
 * ADC, sin ningún costo de GCP. Se adoptó este modo para cortar el gasto de tener la
 * instancia de Cloud SQL prendida durante el desarrollo día a día; la instancia real se
 * borró (ver "Módulo DB" en el contexto del proyecto).
 *
 * MODO NUBE (deploy / demo real): si NO hay `DATABASE_URL`, usa el camino original con
 * `@google-cloud/cloud-sql-connector` + ADC (`INSTANCE_CONNECTION_NAME`, `DB_USER`,
 * `DB_PASSWORD`, `DB_NAME`). IpAddressTypes.PUBLIC porque el Connector abre un túnel
 * seguro autenticado por IAM sin exponer la IP directamente; si la instancia es solo IP
 * privada, cambiar a IpAddressTypes.PRIVATE (y correr el server dentro de la VPC / con
 * conector serverless).
 */
export async function getPool(): Promise<pg.Pool> {
  if (pool) return pool;

  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl) {
    pool = new pg.Pool({ connectionString: databaseUrl, max: 5 });
    return pool;
  }

  const instanceConnectionName = process.env.INSTANCE_CONNECTION_NAME;
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const database = process.env.DB_NAME;

  if (!instanceConnectionName || !user || !password || !database) {
    throw new Error(
      "Faltan variables de entorno de la base de datos. Para desarrollo local, seteá DATABASE_URL (ej. postgresql://postgres:tu_password@localhost:5432/aletheia). Para conectarte a Cloud SQL, seteá INSTANCE_CONNECTION_NAME, DB_USER, DB_PASSWORD y DB_NAME."
    );
  }

  const connector = new Connector();
  const clientOpts = await connector.getOptions({
    instanceConnectionName,
    ipType: IpAddressTypes.PUBLIC,
  });

  pool = new pg.Pool({
    ...clientOpts,
    user,
    password,
    database,
    max: 5,
  });

  return pool;
}
