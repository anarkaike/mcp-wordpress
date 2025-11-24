import { client } from "../../src/db.js";

export default async function handler(req, res) {
  try {
    const result = await client`select table_name from information_schema.tables where table_schema='public' order by table_name`;
    res.status(200).json({ tables: result.map(r => r.table_name) });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
}