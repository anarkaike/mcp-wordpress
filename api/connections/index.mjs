import { db } from "../../src/db.js";
import { serviceConnections, serviceProviders } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import { customAlphabet } from "nanoid";
import { hashToken, encryptJson, decryptJson } from "../../src/crypto.js";
import jwt from "jsonwebtoken";

const nano = customAlphabet("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789", 32);

export default async function handler(req, res) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  let userId = null;
  try {
    if (token) {
      const payload = jwt.verify(token, process.env.JWT_SECRET || "change-me");
      userId = payload.sub;
    }
  } catch (e) {}
  if (req.method === "GET") {
    const rows = await db.select().from(serviceConnections).where(userId ? eq(serviceConnections.userId, userId) : undefined);
    const items = rows.map((r) => {
      let secrets = {};
      try { if (r.secretJson?.enc) secrets = decryptJson(r.secretJson.enc); } catch (e) {}
      const cfg = r.configJson || {};
      return {
        id: r.id,
        name: r.name,
        status: r.status,
        config: { url: cfg.url || cfg.base_url },
        secrets: { username: secrets.username, app_password: secrets.app_password },
        token: secrets.token,
        token_last4: r.tokenLast4,
        created_at: r.createdAt,
        updated_at: r.updatedAt,
      };
    });
    return res.status(200).json({ items });
  }
  if (req.method === "POST") {
    const { provider, name, config, secrets } = req.body || {};
    const key = (provider || "wordpress").toString();
    let provRows = await db.select({ id: serviceProviders.id }).from(serviceProviders).where(eq(serviceProviders.key, key)).limit(1);
    let prov = provRows[0];
    if (!prov) {
      await db.insert(serviceProviders).values({ key, name: key === "wordpress" ? "WordPress" : key, enabled: true });
      provRows = await db.select({ id: serviceProviders.id }).from(serviceProviders).where(eq(serviceProviders.key, key)).limit(1);
      prov = provRows[0];
    }
    const token = nano();
    const tokenHash = hashToken(token);
    const tokenLast4 = token.slice(-4);
    const cfg = config || { url: "https://seusite.com" };
    const sec = { ...(secrets || {}), token };
    const encSecrets = { enc: encryptJson(sec) };
    const inserted = await db.insert(serviceConnections).values({ userId: userId || 1, providerId: prov.id, name: name || key, status: "active", configJson: cfg, secretJson: encSecrets, tokenHash, tokenLast4 }).returning();
    return res.status(201).json({ id: inserted[0]?.id, token, token_last4: tokenLast4 });
  }
  return res.status(405).json({ error: "Método não permitido" });
}