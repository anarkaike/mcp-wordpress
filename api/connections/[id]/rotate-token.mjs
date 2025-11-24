import { db } from "../../../src/db.js";
import { serviceConnections } from "../../../db/schema.js";
import { eq } from "drizzle-orm";
import { hashToken, encryptJson, decryptJson } from "../../../src/crypto.js";
import { customAlphabet } from "nanoid";
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
    const nano = customAlphabet("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789", 32);
    const token = nano();
    const tokenHash = hashToken(token);
    const tokenLast4 = token.slice(-4);
    let secrets = {};
    try { if (r.secretJson?.enc) secrets = decryptJson(r.secretJson.enc); } catch {}
    secrets = { ...secrets, token };
    const secretJson = { enc: encryptJson(secrets) };
    await db.update(serviceConnections).set({ tokenHash, tokenLast4, secretJson }).where(eq(serviceConnections.id, connId));
    return res.status(200).json({ token, token_last4: tokenLast4 });
  } catch (e) {
    return res.status(500).json({ error: String(e.message || e) });
  }
}