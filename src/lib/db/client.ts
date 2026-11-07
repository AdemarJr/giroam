import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

type Db = NodePgDatabase<typeof schema>;

const globalForDb = globalThis as unknown as {
  pgPool?: pg.Pool;
  drizzleDb?: Db;
};

function getPool() {
  if (globalForDb.pgPool) return globalForDb.pgPool;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL não definida. Configure o Postgres do EasyPanel (database giroam).",
    );
  }

  const pool = new pg.Pool({
    connectionString,
    ssl:
      process.env.DATABASE_SSL === "true"
        ? { rejectUnauthorized: false }
        : undefined,
    max: 10,
  });

  globalForDb.pgPool = pool;
  return pool;
}

export function getDb(): Db {
  if (!globalForDb.drizzleDb) {
    globalForDb.drizzleDb = drizzle(getPool(), { schema });
  }
  return globalForDb.drizzleDb;
}

/** Atalho usado nos server actions */
export const db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver);
  },
});
