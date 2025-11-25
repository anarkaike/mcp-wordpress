import { db } from "../../src/db.js";
import { users, auditLogs } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { normalizePhone } from "../../src/validation.js";

const JWT_SECRET = process.env.JWT_SECRET || "change-me";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });
    const { emailOrPhone, password } = req.body || {};
    if (!emailOrPhone || !password) return res.status(400).json({ error: "Informe usuário e senha" });
    const byEmail = await db.select().from(users).where(eq(users.email, String(emailOrPhone))).limit(1);
    let user = byEmail[0];
    if (!user) {
      const phoneNorm = normalizePhone(emailOrPhone);
      const byPhone = await db.select().from(users).where(eq(users.phone, phoneNorm)).limit(1);
      user = byPhone[0];
    }
    if (!user) return res.status(401).json({ error: "Usuário ou senha inválidos" });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      try { await db.insert(auditLogs).values({ userId: null, connectionId: null, action: "auth.login_failed", data: { emailOrPhone: String(emailOrPhone) } }); } catch {}
      return res.status(401).json({ error: "Usuário ou senha inválidos" });
    }
    const token = jwt.sign({ sub: user.id, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: "12h" });
    try { await db.insert(auditLogs).values({ userId: user.id, connectionId: null, action: "auth.login", data: { email: user.email } }); } catch {}
    res.status(200).json({ token, user: { id: user.id, name: user.name, email: user.email, phone: user.phone } });
  } catch (e) {
    const msg = String(e?.message || e);
    if (msg.includes('Failed query')) return res.status(500).json({ error: "Erro ao conectar ao banco de dados. Verifique a configuração." });
    return res.status(500).json({ error: "Erro ao autenticar. Tente novamente." });
  }
}