import { listConnections, getConnection, updateConnection, revokeConnection, deleteConnection, rotateToken, testConnection } from "../../src/handlers/connections.js";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  try {
    const parts = Array.isArray(req.query?.slug) ? req.query.slug : [(req.query?.slug||"")]
    const idStr = parts[0]
    const action = parts[1] || null
    const connId = parseInt(idStr)
    if (!connId) return res.status(400).json({ error: "invalid_id" });

    if (!action) {
      if (req.method === "GET") {
        const data = await getConnection(connId);
        if (!data) return res.status(404).json({ error: "not_found" });
        return res.status(200).json(data);
      }
      if (req.method === "PATCH") {
        const { name, config, secrets } = req.body || {};
        const out = await updateConnection(connId, { name, config, secrets });
        return res.status(200).json(out);
      }
      if (req.method === "DELETE") {
        const out = await deleteConnection(connId);
        if (!out) return res.status(404).json({ error: "not_found" });
        return res.status(200).json(out);
      }
      return res.status(405).json({ error: "method_not_allowed" });
    }

    if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
    if (action === "rotate-token") {
      const out = await rotateToken(connId);
      if (!out) return res.status(404).json({ error: "not_found" });
      return res.status(200).json(out);
    }
    if (action === "revoke") {
      const out = await revokeConnection(connId);
      return res.status(200).json(out);
    }
    if (action === "test") {
      const out = await testConnection(connId);
      return res.status(200).json(out);
    }
    return res.status(404).json({ error: "not_found" });
  } catch (e) {
    return res.status(500).json({ error: String(e.message || e) });
  }
}