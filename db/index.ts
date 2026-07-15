import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}

type SqlClient = ReturnType<typeof postgres>;
const globalForDatabase = globalThis as typeof globalThis & { kidunaSql?: SqlClient };

export const sqlClient = globalForDatabase.kidunaSql ?? postgres(connectionString, {
  max: 1,
  prepare: false,
  connect_timeout: 10,
  idle_timeout: 20,
});

if (process.env.NODE_ENV !== "production") globalForDatabase.kidunaSql = sqlClient;

export const db = drizzle(sqlClient, { schema });
