import { db } from "../../src/db.js";
import { serviceConnections } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import { encryptJson, decryptJson } from "../../src/crypto.js";

export default async function handler(req, res) {
  try {
    const { id } = req.query || {};
    const connId = parseInt(id);
    if (!connId) return res.status(400).json({ error: "invalid_id" });
    const rows = await db.select().from(serviceConnections).where(eq(serviceConnections.id, connId)).limit(1);
    const r = rows[0];
    if (!r) return res.status(404).json({ error: "not_found" });

    if (req.method === "GET") {
      let secrets = {};
      try { if (r.secretJson?.enc) secrets = decryptJson(r.secretJson.enc); } catch {}
      const cfg = r.configJson || {};
      return res.status(200).json({ id: r.id, name: r.name, status: r.status, config: { url: cfg.url || cfg.base_url }, secrets: { username: secrets.username, app_password: secrets.app_password }, token: secrets.token, token_last4: r.tokenLast4, created_at: r.createdAt, updated_at: r.updatedAt });
    }

    if (req.method === "PATCH") {
      const { name, config, secrets } = req.body || {};
      const cfg = config || r.configJson || {};
      let prevSecrets = {};
      try { if (r.secretJson?.enc) prevSecrets = decryptJson(r.secretJson.enc); } catch {}
      const merged = { ...prevSecrets, ...(secrets || {}) };
      const secretJson = { enc: encryptJson(merged) };
      await db.update(serviceConnections).set({ name: name ?? r.name, configJson: cfg, secretJson }).where(eq(serviceConnections.id, connId));
      return res.status(200).json({ ok: true });
    }

    if (req.method === "DELETE") {
      await db.delete(serviceConnections).where(eq(serviceConnections.id, connId));
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "method_not_allowed" });
  } catch (e) {
    return res.status(500).json({ error: String(e.message || e) });
  }
}