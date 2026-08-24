import { Connector, IpAddressTypes } from "@google-cloud/cloud-sql-connector";
import pg from "pg";

let pool: pg.Pool | null = null;

/**
 * Crea (o reutiliza) el pool de conexiones a Cloud SQL de forma perezosa, para no
 * romper el arranque del server si las env vars de DB todavía no están seteadas
 * (mismo patrón que getClient() en geminiClient.ts).
 *
 * Usa IpAddressTypes.PUBLIC porque el Connector abre un túnel seguro autenticado por
 * IAM sin exponer la IP directamente; si la instancia es solo IP privada, cambiar a
 * IpAddressTypes.PRIVATE (y correr el server dentro de la VPC / con conector serverless).
 */
export async function getPool(): Promise<pg.Pool> {
  if (pool) return pool;

  const instanceConnectionName = process.env.INSTANCE_CONNECTION_NAME;
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const database = process.env.DB_NAME;

  if (!instanceConnectionName || !user || !password || !database) {
    throw new Error(
      "Faltan variables de entorno de la base de datos (INSTANCE_CONNECTION_NAME, DB_USER, DB_PASSWORD, DB_NAME)."
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
