import { db } from "../../src/db.js";
import { serviceProviders } from "../../db/schema.js";
import { eq } from "drizzle-orm";

export default async function handler(req, res) {
  const items = [
    { key: "wordpress", name: "WordPress", enabled: true },
    { key: "whatsapp", name: "WhatsApp EvolutionAPI", enabled: true, version: "evolution" },
  ];
  for (const it of items) {
    const rows = await db.select().from(serviceProviders).where(eq(serviceProviders.key, it.key)).limit(1);
    if (!rows[0]) {
      await db.insert(serviceProviders).values({ key: it.key, name: it.name, enabled: it.enabled, version: it.version });
    }
  }
  res.status(200).json({ ok: true });
}