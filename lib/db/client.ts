import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

let database: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (database) return database;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not configured.");
  const sql = postgres(connectionString, { prepare: false, max: 5 });
  database = drizzle(sql);
  return database;
}
