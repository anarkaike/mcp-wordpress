import "dotenv/config";
import express from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { getServer } from "./mcp.js";
import { db } from "./db.js";
import { serviceConnections } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { hashToken } from "./crypto.js";
import { decryptJson } from "./crypto.js";
import { encryptJson } from "./crypto.js";
import { customAlphabet } from "nanoid";
import path from "node:path";
import { fileURLToPath } from "node:url";

const server = getServer();
const app = express();
app.use(express.json());
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(express.static(path.join(__dirname, "../public")));
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});
app.get("/app", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/app.html"));
});

async function mount(handlerPath) {
  const mod = await import(handlerPath);
  return mod.default;
}

app.post("/api/auth/register", async (req, res) => {
  const handler = await mount(path.join(__dirname, "../api/auth/register.mjs"));
  try { await handler(req, res); } catch (e) { res.status(500).json({ error: String(e.message || e) }); }
});

app.post("/api/auth/login", async (req, res) => {
  const handler = await mount(path.join(__dirname, "../api/auth/login.mjs"));
  try { await handler(req, res); } catch (e) { res.status(500).json({ error: String(e.message || e) }); }
});

app.get("/api/connections", async (req, res) => {
  const handler = await mount(path.join(__dirname, "../api/connections/index.mjs"));
  try { await handler(req, res); } catch (e) { res.status(500).json({ error: String(e.message || e) }); }
});
app.post("/api/connections", async (req, res) => {
  const handler = await mount(path.join(__dirname, "../api/connections/index.mjs"));
  try { await handler(req, res); } catch (e) { res.status(500).json({ error: String(e.message || e) }); }
});

app.post("/api/providers/seed", async (req, res) => {
  const handler = await mount(path.join(__dirname, "../api/providers/seed.mjs"));
  try { await handler(req, res); } catch (e) { res.status(500).json({ error: String(e.message || e) }); }
});

app.get("/api/debug/db", async (req, res) => {
  const handler = await mount(path.join(__dirname, "../api/debug/db.mjs"));
  try { await handler(req, res); } catch (e) { res.status(500).json({ error: String(e.message || e) }); }
});

app.get("/api/connections/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const rows = await db.select().from(serviceConnections).where(eq(serviceConnections.id, id)).limit(1);
    const r = rows[0];
    if (!r) return res.status(404).json({ error: "not_found" });
    let secrets = {};
    try { if (r.secretJson?.enc) secrets = decryptJson(r.secretJson.enc); } catch (e) {}
    const cfg = r.configJson || {};
    return res.status(200).json({ id: r.id, name: r.name, status: r.status, config: { url: cfg.url || cfg.base_url }, secrets: { username: secrets.username, app_password: secrets.app_password }, token: secrets.token, token_last4: r.tokenLast4, created_at: r.createdAt, updated_at: r.updatedAt });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

app.post("/api/connections/:id/rotate-token", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const rows = await db.select().from(serviceConnections).where(eq(serviceConnections.id, id)).limit(1);
    const r = rows[0];
    if (!r) return res.status(404).json({ error: "not_found" });
    const nano = customAlphabet("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789", 32);
    const token = nano();
    const tokenHash = hashToken(token);
    const tokenLast4 = token.slice(-4);
    let secrets = {};
    try { if (r.secretJson?.enc) secrets = decryptJson(r.secretJson.enc); } catch (e) {}
    secrets = { ...secrets, token };
    const secretJson = { enc: encryptJson(secrets) };
    await db.update(serviceConnections).set({ tokenHash, tokenLast4, secretJson }).where(eq(serviceConnections.id, id));
    return res.status(200).json({ token, token_last4: tokenLast4 });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

app.post("/api/connections/:id/revoke", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const rows = await db.select().from(serviceConnections).where(eq(serviceConnections.id, id)).limit(1);
    const r = rows[0];
    if (!r) return res.status(404).json({ error: "not_found" });
    await db.update(serviceConnections).set({ status: "revoked" }).where(eq(serviceConnections.id, id));
    return res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

app.post("/api/connections/:id/test", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const rows = await db.select().from(serviceConnections).where(eq(serviceConnections.id, id)).limit(1);
    const r = rows[0];
    if (!r) return res.status(404).json({ error: "not_found" });
    let secrets = {};
    try { if (r.secretJson?.enc) secrets = decryptJson(r.secretJson.enc); } catch (e) {}
    const cfg = r.configJson || {};
    const baseUrl = (cfg.url || cfg.base_url || "").toString();
    if (!baseUrl) return res.status(200).json({ ok: false, error: "missing_url" });
    const endpoint = baseUrl.endsWith("/wp-json") ? baseUrl : `${baseUrl.replace(/\/$/, "")}/wp-json`;
    let ok = false;
    let info = {};
    try {
      const mod = await import("wpapi");
      const WPAPI = mod.default || mod;
      const wp = new WPAPI({ endpoint, username: secrets.username, password: secrets.app_password, auth: Boolean(secrets.username && secrets.app_password) });
      await wp.posts().perPage(1).page(1).get();
      ok = true;
      info = { endpoint };
    } catch (e) {
      ok = false;
      info = { endpoint, error: String(e.message || e) };
    }
    return res.status(200).json({ ok, info });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

app.delete("/api/connections/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const rows = await db.select().from(serviceConnections).where(eq(serviceConnections.id, id)).limit(1);
    const r = rows[0];
    if (!r) return res.status(404).json({ error: "not_found" });
    await db.delete(serviceConnections).where(eq(serviceConnections.id, id));
    return res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

app.patch("/api/connections/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const rows = await db.select().from(serviceConnections).where(eq(serviceConnections.id, id)).limit(1);
    const r = rows[0];
    if (!r) return res.status(404).json({ error: "not_found" });
    const { name, config, secrets } = req.body || {};
    const cfg = config || r.configJson || {};
    const secPrev = (() => { try { return r.secretJson?.enc ? decryptJson(r.secretJson.enc) : {}; } catch { return {}; } })();
    const sec = { ...secPrev, ...(secrets || {}) };
    const secretJson = { enc: encryptJson(sec) };
    const payload = { name: name ?? r.name, configJson: cfg, secretJson };
    await db.update(serviceConnections).set(payload).where(eq(serviceConnections.id, id));
    return res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

app.get("/api/health", async (req, res) => {
  const handler = await mount(path.join(__dirname, "../api/health.mjs"));
  try { await handler(req, res); } catch (e) { res.status(500).json({ error: String(e.message || e) }); }
});

app.post("/api/admin/migrate", async (req, res) => {
  const handler = await mount(path.join(__dirname, "../api/admin/migrate.mjs"));
  try { await handler(req, res); } catch (e) { res.status(500).json({ error: String(e.message || e) }); }
});

app.get("/mcp", (req, res) => {
  const env = process.env || {};
  const hasWpUrl = Boolean((env.WP_URL ?? env.WP_Url ?? env.wp_url ?? "").trim());
  const hasUsername = Boolean((env.WP_USERNAME ?? env.WP_Username ?? env.wp_username ?? "").trim());
  const hasPassword = Boolean((env.WP_APP_PASSWORD ?? env.WP_App_Password ?? env.wp_app_password ?? "").trim());
  res.status(200).json({ status: "ok", name: "mcp-wordpress", endpoint: "/mcp", transport: "streamable-http", env: { hasWpUrl, hasUsername, hasPassword } });
});

app.post("/mcp", async (req, res) => {
  try {
    const auth = req.headers.authorization || "";
    const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    const token = (bearer || (req.query?.token || "")).toString();
    if (!token) return res.status(401).json({ error: "missing_token" });
    const tokenHash = hashToken(token);
    const rows = await db.select().from(serviceConnections).where(eq(serviceConnections.tokenHash, tokenHash)).limit(1);
    const conn = rows[0];
    if (!conn) return res.status(401).json({ error: "invalid_token" });
    if ((conn.status || "").toLowerCase() === "revoked") return res.status(403).json({ error: "revoked" });
    const cfg = conn.configJson || {};
    const secretsEnc = conn.secretJson?.enc;
    if (!cfg?.base_url && !cfg?.url) return res.status(500).json({ error: "provider_not_configured" });
    let secrets = {};
    try { if (secretsEnc) secrets = decryptJson(secretsEnc); } catch (e) {}
    const baseUrl = (cfg.url || cfg.base_url || "").toString();
    const username = (secrets.username || secrets.user || "").toString();
    const appPassword = (secrets.app_password || secrets.password || "").toString();
    process.env.WP_URL = baseUrl;
    process.env.WP_USERNAME = username;
    process.env.WP_APP_PASSWORD = appPassword;
    const transport = new StreamableHTTPServerTransport({ enableJsonResponse: true });
    res.on("close", () => transport.close());
    const s = getServer();
    await s.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

const port = parseInt(process.env.PORT || "3001");
app.listen(port, () => {
  console.log(`MCP WordPress server rodando em http://localhost:${port}/mcp`);
}).on("error", (error) => {
  console.error("Erro no servidor:", error);
  process.exit(1);
});