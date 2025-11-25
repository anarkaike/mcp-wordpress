import { listConnections, createConnection } from "../../src/handlers/connections.js";
import jwt from "jsonwebtoken";

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
    const items = await listConnections(userId);
    return res.status(200).json({ items });
  }
  if (req.method === "POST") {
    const { provider, name, config, secrets } = req.body || {};
    const out = await createConnection({ userId: userId || 1, providerKey: (provider || "wordpress").toString(), name: name || (provider || "wordpress"), config, secrets });
    return res.status(201).json(out);
  }
  return res.status(405).json({ error: "Método não permitido" });
}