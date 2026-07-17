/**
 * Prisma 7 client singleton.
 *
 * Prisma 7 removed direct URL support from PrismaClient.
 * A pg adapter is required for direct PostgreSQL connections.
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var _kinshipPrisma: PrismaClient | undefined;
}

function createClient() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma: PrismaClient =
  globalThis._kinshipPrisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalThis._kinshipPrisma = prisma;
}
