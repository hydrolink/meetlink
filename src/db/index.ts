import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

// Prevent multiple client instances during Next.js hot reload in development
const globalForDb = globalThis as unknown as {
  dbClient: ReturnType<typeof createClient> | undefined;
};

const client =
  globalForDb.dbClient ??
  createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.dbClient = client;
}

export const db = drizzle(client, { schema });
export type DB = typeof db;
