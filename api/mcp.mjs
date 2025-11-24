import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { getServer } from "../src/mcp.js";
import { db } from "../src/db.js";
import { serviceConnections, serviceProviders } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { hashToken, decryptJson } from "../src/crypto.js";
import { createServerForProvider } from "../src/providers/index.js";
export const config = { runtime: "nodejs" };

export default async function handler(req, res) {
  if (req.method === "GET") {
    const env = process.env || {};
    const hasWpUrl = Boolean((env.WP_URL ?? env.WP_Url ?? env.wp_url ?? "").trim());
    const hasUsername = Boolean((env.WP_USERNAME ?? env.WP_Username ?? env.wp_username ?? "").trim());
    const hasPassword = Boolean((env.WP_APP_PASSWORD ?? env.WP_App_Password ?? env.wp_app_password ?? "").trim());
    res.status(200).json({ status: "ok", name: "mcp-wordpress", endpoint: "/api/mcp", transport: "streamable-http", env: { hasWpUrl, hasUsername, hasPassword } });
    return;
  }
  const providerParam = (req.query?.provider || req.params?.provider || "").toString().trim();
  const auth = req.headers?.authorization || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const tokenParam = (bearer || req.query?.token || "").toString().trim();
  let server = null;

  if (!tokenParam) {
    // Sem token: não permitir sessão MCP autenticada em produção
    return res.status(401).json({ error: "missing_token" });
  }

  const tokenHash = hashToken(tokenParam);
  const rows = await db.select({
    connId: serviceConnections.id,
    name: serviceConnections.name,
    status: serviceConnections.status,
    configJson: serviceConnections.configJson,
    secretJson: serviceConnections.secretJson,
    providerId: serviceConnections.providerId,
  }).from(serviceConnections).where(eq(serviceConnections.tokenHash, tokenHash)).limit(1);
  const conn = rows[0];
  if (!conn) return res.status(401).json({ error: "invalid_token" });
  if ((conn.status || "").toLowerCase() === "revoked") return res.status(403).json({ error: "revoked" });

  const provRows = await db.select({ id: serviceProviders.id, key: serviceProviders.key }).from(serviceProviders).where(eq(serviceProviders.id, conn.providerId)).limit(1);
  const prov = provRows[0];
  if (!prov) return res.status(400).json({ error: "provider_not_found" });
  if (providerParam && prov.key !== providerParam) return res.status(400).json({ error: "provider_mismatch" });

  let secrets = {};
  try { if (conn.secretJson?.enc) secrets = decryptJson(conn.secretJson.enc); } catch {}
  const cfg = conn.configJson || {};
  server = createServerForProvider(prov.key, { config: cfg, secrets });
  const transport = new StreamableHTTPServerTransport({ enableJsonResponse: true });
  res.on("close", () => transport.close());
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
}