import { db } from "../../src/db.js";
import { users, auditLogs } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { normalizePhone, isEmail } from "../../src/validation.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });
    const { name, email, phone, password } = req.body || {};
    if (!name || !email || !phone || !password) return res.status(400).json({ error: "Preencha todos os campos" });
    if (!isEmail(email)) return res.status(400).json({ error: "Email inválido" });
    if (String(password).length < 8) return res.status(400).json({ error: "A senha precisa ter pelo menos 8 caracteres" });
    const phoneNorm = normalizePhone(phone);
    const emailRows = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (emailRows[0]) return res.status(409).json({ error: "Este e-mail já está cadastrado" });
    const phoneRows = await db.select().from(users).where(eq(users.phone, phoneNorm)).limit(1);
    if (phoneRows[0]) return res.status(409).json({ error: "Este telefone já está cadastrado" });
    const hash = await bcrypt.hash(password, 10);
    const inserted = await db.insert(users).values({ name, email, phone: phoneNorm, passwordHash: hash }).returning();
    const u = inserted[0];
    try { await db.insert(auditLogs).values({ userId: u.id, connectionId: null, action: "auth.register", data: { email } }); } catch {}
    res.status(201).json({ id: u.id, name: u.name, email: u.email, phone: u.phone });
  } catch (e) {
    const msg = String(e?.message || e);
    if (msg.includes('Failed query')) return res.status(500).json({ error: "Erro ao conectar ao banco de dados. Verifique a configuração." });
    return res.status(500).json({ error: "Erro ao cadastrar. Tente novamente." });
  }
}
