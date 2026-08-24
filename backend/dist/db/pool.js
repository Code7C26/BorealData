"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPool = getPool;
const cloud_sql_connector_1 = require("@google-cloud/cloud-sql-connector");
const pg_1 = __importDefault(require("pg"));
let pool = null;
/**
 * Crea (o reutiliza) el pool de conexiones a Cloud SQL de forma perezosa, para no
 * romper el arranque del server si las env vars de DB todavía no están seteadas
 * (mismo patrón que getClient() en geminiClient.ts).
 *
 * Usa IpAddressTypes.PUBLIC porque el Connector abre un túnel seguro autenticado por
 * IAM sin exponer la IP directamente; si la instancia es solo IP privada, cambiar a
 * IpAddressTypes.PRIVATE (y correr el server dentro de la VPC / con conector serverless).
 */
async function getPool() {
    if (pool)
        return pool;
    const instanceConnectionName = process.env.INSTANCE_CONNECTION_NAME;
    const user = process.env.DB_USER;
    const password = process.env.DB_PASSWORD;
    const database = process.env.DB_NAME;
    if (!instanceConnectionName || !user || !password || !database) {
        throw new Error("Faltan variables de entorno de la base de datos (INSTANCE_CONNECTION_NAME, DB_USER, DB_PASSWORD, DB_NAME).");
    }
    const connector = new cloud_sql_connector_1.Connector();
    const clientOpts = await connector.getOptions({
        instanceConnectionName,
        ipType: cloud_sql_connector_1.IpAddressTypes.PUBLIC,
    });
    pool = new pg_1.default.Pool({
        ...clientOpts,
        user,
        password,
        database,
        max: 5,
    });
    return pool;
}
