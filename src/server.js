import "dotenv/config";
import express from "express";
// MCP é servido via handler compartilhado em api/mcp.mjs
import { db } from "./db.js";
import { serviceConnections, mcpTokens, auditLogs } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { hashToken } from "./crypto.js";
import { decryptJson } from "./crypto.js";
import { encryptJson } from "./crypto.js";
import { customAlphabet } from "nanoid";
import { listConnections, getConnection, updateConnection, rotateToken as hRotateToken, revokeConnection as hRevokeConnection, deleteConnection as hDeleteConnection, testConnection as hTestConnection } from "./handlers/connections.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

// servidor MCP antigo removido
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

app.get("/api/debug/connection/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const rows = await db.select().from(serviceConnections).where(eq(serviceConnections.id, id)).limit(1);
    const r = rows[0];
    return res.status(200).json({
      id: r?.id,
      name: r?.name,
      status: r?.status,
      tokenHash: r?.tokenHash,
      tokenLast4: r?.tokenLast4,
      secretJson: r?.secretJson,
      configJson: r?.configJson,
      createdAt: r?.createdAt,
      updatedAt: r?.updatedAt,
    });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

app.get("/api/debug/token/:token", async (req, res) => {
  try {
    const raw = (req.params.token || "").toString();
    const tokenHash = hashToken(raw);
    const tokRows = await db.select().from(mcpTokens).where(eq(mcpTokens.tokenHash, tokenHash)).limit(1);
    const tok = tokRows[0];
    let connId = tok?.connectionId;
    if (!connId) {
      const rows = await db.select().from(serviceConnections).where(eq(serviceConnections.tokenHash, tokenHash)).limit(1);
      connId = rows[0]?.id;
    }
    if (!connId) return res.status(404).json({ error: "not_found" });
    const connRows = await db.select().from(serviceConnections).where(eq(serviceConnections.id, connId)).limit(1);
    const r = connRows[0];
    const cfg = r?.configJson || {};
    return res.status(200).json({ connection_id: connId, url: cfg.url || cfg.base_url, status: r?.status });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

app.get("/api/connections/:id", async (req, res) => {
  try { const id = parseInt(req.params.id); const data = await getConnection(id); if (!data) return res.status(404).json({ error: "not_found" }); return res.status(200).json(data); }
  catch (e) { res.status(500).json({ error: String(e.message || e) }); }
});

app.post("/api/connections/:id/rotate-token", async (req, res) => {
  try { const id = parseInt(req.params.id); const out = await hRotateToken(id); if (!out) return res.status(404).json({ error: "not_found" }); return res.status(200).json(out); }
  catch (e) { res.status(500).json({ error: String(e.message || e) }); }
});

app.post("/api/connections/:id/revoke", async (req, res) => {
  try { const id = parseInt(req.params.id); const out = await hRevokeConnection(id); return res.status(200).json(out); }
  catch (e) { res.status(500).json({ error: String(e.message || e) }); }
});

app.post("/api/connections/:id/test", async (req, res) => {
  try { const id = parseInt(req.params.id); const out = await hTestConnection(id); return res.status(200).json(out); }
  catch (e) { res.status(500).json({ error: String(e.message || e) }); }
});

app.delete("/api/connections/:id", async (req, res) => {
  try { const id = parseInt(req.params.id); const out = await hDeleteConnection(id); if (!out) return res.status(404).json({ error: "not_found" }); return res.status(200).json(out); }
  catch (e) { res.status(500).json({ error: String(e.message || e) }); }
});

app.patch("/api/connections/:id", async (req, res) => {
  try { const id = parseInt(req.params.id); const { name, config, secrets } = req.body || {}; const out = await updateConnection(id, { name, config, secrets }); if (!out) return res.status(404).json({ error: "not_found" }); return res.status(200).json(out); }
  catch (e) { res.status(500).json({ error: String(e.message || e) }); }
});

app.get("/api/health", async (req, res) => {
  const handler = await mount(path.join(__dirname, "../api/health.mjs"));
  try { await handler(req, res); } catch (e) { res.status(500).json({ error: String(e.message || e) }); }
});

app.post("/api/admin/migrate", async (req, res) => {
  const handler = await mount(path.join(__dirname, "../api/admin/migrate.mjs"));
  try { await handler(req, res); } catch (e) { res.status(500).json({ error: String(e.message || e) }); }
});

app.post("/api/mcp", async (req, res) => {
  const handler = await mount(path.join(__dirname, "../api/mcp.mjs"));
  try { await handler(req, res); } catch (e) { res.status(500).json({ error: String(e.message || e) }); }
});

app.get("/mcp", async (req, res) => {
  const handler = await mount(path.join(__dirname, "../api/mcp.mjs"));
  try { await handler(req, res); } catch (e) { res.status(500).json({ error: String(e.message || e) }); }
});

app.post("/mcp", async (req, res) => {
  const handler = await mount(path.join(__dirname, "../api/mcp.mjs"));
  try { await handler(req, res); } catch (e) { res.status(500).json({ error: String(e.message || e) }); }
});

// GET /mcp já mapeado acima para o handler compartilhado

export { app };
const port = parseInt(process.env.PORT || "3001");
if (!process.env.NO_LISTEN) {
  app.listen(port, () => {
    console.log(`MCP WordPress server rodando em http://localhost:${port}/mcp`);
  }).on("error", (error) => {
    console.error("Erro no servidor:", error);
    process.exit(1);
  });
}