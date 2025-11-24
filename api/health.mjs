import { client } from "../src/db.js";

function maskDbUrl(u) {
  if (!u) return null;
  try {
    const m = u.match(/^(postgresql:\/\/)([^:]+):([^@]+)@([^\/?]+)(?:\/([^?]+))?(?:\?(.+))?$/);
    if (!m) return { raw: u };
    return {
      scheme: m[1],
      user: m[2],
      password: "***",
      host: m[4],
      database: m[5] || null,
      query: m[6] || null,
    };
  } catch {
    return { raw: u };
  }
}

export default async function handler(req, res) {
  const env = process.env || {};
  const hasDatabaseUrl = Boolean((env.DATABASE_URL || "").trim());
  const hasJwtSecret = Boolean((env.JWT_SECRET || "").trim());
  const hasSecretKey = Boolean((env.SECRET_KEY || "").trim());
  let db = "down";
  let error = null;
  try {
    const r = await client`select 1 as ok`;
    if (Array.isArray(r) && r.length) db = "up";
  } catch (e) {
    error = String(e?.message || e);
  }
  res.status(200).json({ db, error, env: { hasDatabaseUrl, hasJwtSecret, hasSecretKey, databaseUrlMasked: maskDbUrl(env.DATABASE_URL) } });
}