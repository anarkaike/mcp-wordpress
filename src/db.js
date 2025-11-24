import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "../db/schema.js";

const fallbackLocal = process.env.DATABASE_URL_DEFAULT || "postgres://postgres:postgres@localhost:54322/postgres";
const url = process.env.DATABASE_URL
  || process.env.POSTGRES_URL
  || process.env.POSTGRES_PRISMA_URL
  || process.env.POSTGRES_URL_NON_POOLING
  || process.env.POSTGRES_URL_NO_SSL
  || fallbackLocal;
const useSSL = !/localhost|127\.0\.0\.1/.test(url);
export const client = postgres(url, {
  prepare: true,
  max: 5,
  ...(useSSL ? { ssl: { rejectUnauthorized: false } } : {}),
  onnotice: () => {}
});
export const db = drizzle(client, { schema });