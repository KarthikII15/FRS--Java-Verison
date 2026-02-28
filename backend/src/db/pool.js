import pg from "pg";
import { env } from "../config/env.js";

const { Pool } = pg;

export const pool = new Pool({
  host: env.db.host,
  port: env.db.port,
  database: env.db.database,
  user: env.db.user,
  password: env.db.password,
  max: env.db.max,
  idleTimeoutMillis: env.db.idleTimeoutMillis,
  connectionTimeoutMillis: env.db.connectionTimeoutMillis,
  ssl: env.db.ssl ? { rejectUnauthorized: false } : false,
});

pool.on("error", (err) => {
  console.error("Unexpected DB pool error", err);
});

export async function query(text, params = []) {
  return pool.query(text, params);
}

export async function checkDbConnection() {
  const result = await query("select now() as now");
  return result.rows[0]?.now ?? null;
}

