import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { databaseUrl } from "@/lib/config/runtime-secrets";

let database: ReturnType<typeof drizzle> | null = null;

export const databaseConnectionOptions = {
  prepare: false,
  max: 5,
  connect_timeout: 5,
} as const;

export function getDb() {
  if (database) return database;
  const connectionString = databaseUrl();
  if (!connectionString) throw new Error("DATABASE_URL is not configured.");
  const sql = postgres(connectionString, databaseConnectionOptions);
  database = drizzle(sql);
  return database;
}
