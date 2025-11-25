import { db } from "../db.js";
import { serviceConnections, serviceProviders, mcpTokens, auditLogs, users } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import { hashToken, encryptJson, decryptJson } from "../crypto.js";
import { customAlphabet } from "nanoid";

export async function listConnections(userId) {
  const rows = await db.select().from(serviceConnections).where(userId ? eq(serviceConnections.userId, userId) : undefined);
  return rows.map((r) => {
    let secrets = {};
    try { if (r.secretJson?.enc) secrets = decryptJson(r.secretJson.enc); } catch {}
    const cfg = r.configJson || {};
    return { id: r.id, name: r.name, status: r.status, config: { url: cfg.url || cfg.base_url }, secrets: { username: secrets.username, app_password: secrets.app_password }, token: secrets.token, token_last4: r.tokenLast4, created_at: r.createdAt, updated_at: r.updatedAt };
  });
}

export async function getConnection(id) {
  const rows = await db.select().from(serviceConnections).where(eq(serviceConnections.id, id)).limit(1);
  const r = rows[0];
  if (!r) return null;
  let secrets = {};
  try { if (r.secretJson?.enc) secrets = decryptJson(r.secretJson.enc); } catch {}
  const cfg = r.configJson || {};
  return { id: r.id, name: r.name, status: r.status, config: { url: cfg.url || cfg.base_url }, secrets: { username: secrets.username, app_password: secrets.app_password }, token: secrets.token, token_last4: r.tokenLast4, created_at: r.createdAt, updated_at: r.updatedAt };
}

export async function createConnection({ userId, providerKey, name, config, secrets }) {
  const provRows = await db.select({ id: serviceProviders.id }).from(serviceProviders).where(eq(serviceProviders.key, providerKey)).limit(1);
  let prov = provRows[0];
  if (!prov) {
    await db.insert(serviceProviders).values({ key: providerKey, name: providerKey === "wordpress" ? "WordPress" : providerKey, enabled: true });
    const again = await db.select({ id: serviceProviders.id }).from(serviceProviders).where(eq(serviceProviders.key, providerKey)).limit(1);
    prov = again[0];
  }
  const nano = customAlphabet("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789", 32);
  const token = nano();
  const tokenHash = hashToken(token);
  const tokenLast4 = token.slice(-4);
  const cfg = config || {};
  const sec = { ...(secrets || {}), token };
  const encSecrets = { enc: encryptJson(sec) };
  const inserted = await db.insert(serviceConnections).values({ userId, providerId: prov.id, name, status: "active", configJson: cfg, secretJson: encSecrets, tokenHash, tokenLast4 }).returning();
  const connId = inserted[0]?.id;
  if (connId) {
    await db.insert(mcpTokens).values({ connectionId: connId, tokenHash });
    await db.insert(auditLogs).values({ userId: userId || null, connectionId: connId, action: "connections.create", data: { provider: providerKey, token_last4: tokenLast4 } });
  }
  return { id: connId, token, token_last4: tokenLast4 };
}

export async function updateConnection(id, { name, config, secrets }) {
  const rows = await db.select().from(serviceConnections).where(eq(serviceConnections.id, id)).limit(1);
  const r = rows[0];
  if (!r) return null;
  const cfg = config || r.configJson || {};
  let prevSecrets = {};
  try { if (r.secretJson?.enc) prevSecrets = decryptJson(r.secretJson.enc); } catch {}
  const merged = { ...prevSecrets, ...(secrets || {}) };
  const secretJson = { enc: encryptJson(merged) };
  await db.update(serviceConnections).set({ name: name ?? r.name, configJson: cfg, secretJson }).where(eq(serviceConnections.id, id));
  return { ok: true };
}

export async function rotateToken(id) {
  const rows = await db.select().from(serviceConnections).where(eq(serviceConnections.id, id)).limit(1);
  const r = rows[0];
  if (!r) return null;
  const nano = customAlphabet("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789", 32);
  const token = nano();
  const tokenHash = hashToken(token);
  const tokenLast4 = token.slice(-4);
  let secrets = {};
  try { if (r.secretJson?.enc) secrets = decryptJson(r.secretJson.enc); } catch {}
  secrets = { ...secrets, token };
  const secretJson = { enc: encryptJson(secrets) };
  const now = new Date();
  await db.update(serviceConnections).set({ tokenHash, tokenLast4, secretJson, status: "active" }).where(eq(serviceConnections.id, id));
  await db.update(mcpTokens).set({ revokedAt: now }).where(eq(mcpTokens.connectionId, id));
  await db.insert(mcpTokens).values({ connectionId: id, tokenHash });
  const connRows = await db.select().from(serviceConnections).where(eq(serviceConnections.id, id)).limit(1);
  const r2 = connRows[0];
  await db.insert(auditLogs).values({ userId: r2?.userId || null, connectionId: id, action: "connections.rotate_token", data: { token_last4: tokenLast4 } });
  return { token, token_last4: tokenLast4 };
}

export async function revokeConnection(id) {
  const now = new Date();
  await db.update(serviceConnections).set({ status: "revoked" }).where(eq(serviceConnections.id, id));
  await db.update(mcpTokens).set({ revokedAt: now }).where(eq(mcpTokens.connectionId, id));
  const connRows = await db.select().from(serviceConnections).where(eq(serviceConnections.id, id)).limit(1);
  const r = connRows[0];
  await db.insert(auditLogs).values({ userId: r?.userId || null, connectionId: id, action: "connections.revoke", data: {} });
  return { ok: true };
}

export async function deleteConnection(id) {
  const rows = await db.select().from(serviceConnections).where(eq(serviceConnections.id, id)).limit(1);
  const r = rows[0];
  if (!r) return null;
  let uid = null;
  if (r.userId) {
    const u = await db.select({ id: users.id }).from(users).where(eq(users.id, r.userId)).limit(1);
    if (u[0]?.id) uid = r.userId; else uid = null;
  }
  try { await db.insert(auditLogs).values({ userId: uid, connectionId: id, action: "connections.delete", data: {} }); } catch {}
  await db.delete(serviceConnections).where(eq(serviceConnections.id, id));
  return { ok: true };
}

export async function testConnection(id) {
  const rows = await db.select().from(serviceConnections).where(eq(serviceConnections.id, id)).limit(1);
  const r = rows[0];
  if (!r) return { ok: false, error: "not_found" };
  let secrets = {};
  try { if (r.secretJson?.enc) secrets = decryptJson(r.secretJson.enc); } catch {}
  const cfg = r.configJson || {};
  const baseUrl = (cfg.url || cfg.base_url || "").toString();
  if (!baseUrl) return { ok: false, error: "missing_url" };
  const endpoint = baseUrl.endsWith("/wp-json") ? baseUrl : `${baseUrl.replace(/\/$/, "")}/wp-json`;
  try {
    const mod = await import("wpapi");
    const WPAPI = mod.default || mod;
    const wp = new WPAPI({ endpoint, username: secrets.username, password: secrets.app_password, auth: Boolean(secrets.username && secrets.app_password) });
    await wp.posts().perPage(1).page(1).get();
    return { ok: true, info: { endpoint } };
  } catch (e) {
    return { ok: false, info: { endpoint, error: String(e.message || e) } };
  }
}