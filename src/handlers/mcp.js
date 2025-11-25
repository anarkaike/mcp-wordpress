import { db } from "../db.js";
import { serviceConnections, serviceProviders, mcpTokens } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import { hashToken, decryptJson } from "../crypto.js";
import { createServerForProvider } from "../providers/index.js";

export async function resolveMcpServer(providerParam, tokenParam) {
  if (!tokenParam) return { error: { code: 401, body: { error: "missing_token" } } };
  const tokenHash = hashToken(tokenParam);
  // 1) Preferir mcp_tokens
  const tokRows = await db.select().from(mcpTokens).where(eq(mcpTokens.tokenHash, tokenHash)).limit(1);
  const tok = tokRows[0];
  if (tok) {
    if (tok.revokedAt) return { error: { code: 403, body: { error: "revoked" } } };
    if (tok.expiresAt && new Date(tok.expiresAt) <= new Date()) return { error: { code: 401, body: { error: "expired" } } };
    const connRows = await db.select({
      id: serviceConnections.id,
      status: serviceConnections.status,
      configJson: serviceConnections.configJson,
      secretJson: serviceConnections.secretJson,
      providerId: serviceConnections.providerId,
    }).from(serviceConnections).where(eq(serviceConnections.id, tok.connectionId)).limit(1);
    const conn = connRows[0];
    if (!conn) return { error: { code: 401, body: { error: "invalid_token" } } };
    if ((conn.status || "").toLowerCase() === "revoked") return { error: { code: 403, body: { error: "revoked" } } };
    const provRows = await db.select({ id: serviceProviders.id, key: serviceProviders.key }).from(serviceProviders).where(eq(serviceProviders.id, conn.providerId)).limit(1);
    const prov = provRows[0];
    if (!prov) return { error: { code: 400, body: { error: "provider_not_found" } } };
    if (providerParam && prov.key !== providerParam) return { error: { code: 400, body: { error: "provider_mismatch" } } };
    let secrets = {};
    try { if (conn.secretJson?.enc) secrets = decryptJson(conn.secretJson.enc); } catch {}
    const cfg = conn.configJson || {};
    const server = createServerForProvider(prov.key, { config: cfg, secrets });
    return { server };
  }
  // 2) Fallback: service_connections
  const rows = await db.select({
    id: serviceConnections.id,
    status: serviceConnections.status,
    configJson: serviceConnections.configJson,
    secretJson: serviceConnections.secretJson,
    providerId: serviceConnections.providerId,
  }).from(serviceConnections).where(eq(serviceConnections.tokenHash, tokenHash)).limit(1);
  const conn = rows[0];
  if (!conn) return { error: { code: 401, body: { error: "invalid_token" } } };
  if ((conn.status || "").toLowerCase() === "revoked") return { error: { code: 403, body: { error: "revoked" } } };
  const provRows = await db.select({ id: serviceProviders.id, key: serviceProviders.key }).from(serviceProviders).where(eq(serviceProviders.id, conn.providerId)).limit(1);
  const prov = provRows[0];
  if (!prov) return { error: { code: 400, body: { error: "provider_not_found" } } };
  if (providerParam && prov.key !== providerParam) return { error: { code: 400, body: { error: "provider_mismatch" } } };
  let secrets = {};
  try { if (conn.secretJson?.enc) secrets = decryptJson(conn.secretJson.enc); } catch {}
  const cfg = conn.configJson || {};
  const server = createServerForProvider(prov.key, { config: cfg, secrets });
  return { server };
}