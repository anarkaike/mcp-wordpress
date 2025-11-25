import { client } from "../../src/db.js";
import { db } from "../../src/db.js";
import { mcpTokens, auditLogs } from "../../db/schema.js";

export default async function handler(req, res) {
  try {
    const result = await client`select table_name from information_schema.tables where table_schema='public' order by table_name`;
    if (String(req.query?.counts || "") === "1") {
      const t = await db.select().from(mcpTokens);
      const l = await db.select().from(auditLogs);
      res.status(200).json({ tables: result.map(r => r.table_name), counts: { mcp_tokens: t.length, mcp_audit_logs: l.length } });
      return;
    }
    res.status(200).json({ tables: result.map(r => r.table_name) });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
}