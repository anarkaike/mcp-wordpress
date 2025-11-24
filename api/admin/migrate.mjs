import { client } from "../../src/db.js";

const sql = `
CREATE TABLE IF NOT EXISTS "mcp_users" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" varchar(150) NOT NULL,
  "email" varchar(190) NOT NULL,
  "phone" varchar(20) NOT NULL,
  "password_hash" varchar(255) NOT NULL,
  "reset_token" varchar(64),
  "reset_expires_at" timestamp,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "mcp_users_email_unique" ON "mcp_users" ("email");
CREATE TABLE IF NOT EXISTS "mcp_service_providers" (
  "id" serial PRIMARY KEY NOT NULL,
  "key" varchar(40) NOT NULL,
  "name" varchar(100) NOT NULL,
  "enabled" boolean DEFAULT true,
  "version" varchar(20),
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "mcp_service_providers_key_unique" ON "mcp_service_providers" ("key");
CREATE TABLE IF NOT EXISTS "mcp_service_connections" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL REFERENCES "mcp_users"("id") ON DELETE CASCADE,
  "provider_id" integer NOT NULL REFERENCES "mcp_service_providers"("id") ON DELETE CASCADE,
  "name" varchar(120) NOT NULL,
  "status" varchar(20) NOT NULL,
  "config_json" jsonb NOT NULL,
  "secret_json" jsonb NOT NULL,
  "token_hash" varchar(64) NOT NULL,
  "token_last4" varchar(8),
  "token_created_at" timestamp DEFAULT now(),
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "mcp_service_connections_token_unique" ON "mcp_service_connections" ("token_hash");
CREATE TABLE IF NOT EXISTS "mcp_tokens" (
  "id" serial PRIMARY KEY NOT NULL,
  "connection_id" integer NOT NULL REFERENCES "mcp_service_connections"("id") ON DELETE CASCADE,
  "token_hash" varchar(64) NOT NULL,
  "expires_at" timestamp,
  "revoked_at" timestamp,
  "created_at" timestamp DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "mcp_tokens_token_unique" ON "mcp_tokens" ("token_hash");
CREATE TABLE IF NOT EXISTS "mcp_audit_logs" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer REFERENCES "mcp_users"("id") ON DELETE SET NULL,
  "connection_id" integer REFERENCES "mcp_service_connections"("id") ON DELETE SET NULL,
  "action" varchar(60) NOT NULL,
  "data" jsonb,
  "created_at" timestamp DEFAULT now()
);
`;

export default async function handler(req, res) {
  const adminKey = process.env.ADMIN_KEY || "";
  const headerKey = req.headers["x-admin-key"] || req.headers["X-Admin-Key"] || req.headers["x-admin-key"];
  if (!adminKey || headerKey !== adminKey) return res.status(401).json({ error: "unauthorized" });
  try {
    await client.unsafe(sql);
    const t = await client`select table_name from information_schema.tables where table_schema='public' order by table_name`;
    res.status(200).json({ ok: true, tables: t.map(r => r.table_name) });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
}