import { db } from "../../../src/db.js";
import { serviceConnections } from "../../../db/schema.js";
import { eq } from "drizzle-orm";
import { decryptJson } from "../../../src/crypto.js";
export const config = { runtime: "nodejs" };

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
    const { id } = req.query || {};
    const connId = parseInt(id);
    if (!connId) return res.status(400).json({ error: "invalid_id" });
    const rows = await db.select().from(serviceConnections).where(eq(serviceConnections.id, connId)).limit(1);
    const r = rows[0];
    if (!r) return res.status(404).json({ error: "not_found" });
    let secrets = {};
    try { if (r.secretJson?.enc) secrets = decryptJson(r.secretJson.enc); } catch {}
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
    return res.status(500).json({ error: String(e.message || e) });
  }
}