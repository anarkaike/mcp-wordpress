import { db } from "../../../src/db.js";
import { serviceConnections } from "../../../db/schema.js";
import { eq } from "drizzle-orm";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
    const { id } = req.query || {};
    const connId = parseInt(id);
    if (!connId) return res.status(400).json({ error: "invalid_id" });
    const rows = await db.select().from(serviceConnections).where(eq(serviceConnections.id, connId)).limit(1);
    const r = rows[0];
    if (!r) return res.status(404).json({ error: "not_found" });
    await db.update(serviceConnections).set({ status: "revoked" }).where(eq(serviceConnections.id, connId));
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: String(e.message || e) });
  }
}