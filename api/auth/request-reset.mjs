import { db } from "../../src/db.js"
import { users, auditLogs } from "../../db/schema.js"
import { eq } from "drizzle-orm"

export default async function handler(req, res){
  try{
    if(req.method!=="POST") return res.status(405).json({ error: "Método não permitido" })
    const { emailOrPhone } = req.body||{}
    if(!emailOrPhone) return res.status(400).json({ error: "Informe email ou telefone" })
    const email = String(emailOrPhone)
    const uRows = await db.select().from(users).where(eq(users.email, email)).limit(1)
    const u = uRows[0]
    if(!u) return res.status(200).json({ ok: true })
    try{ await db.insert(auditLogs).values({ userId: u.id, connectionId: null, action: "auth.request_reset", data: { email } }) }catch{}
    return res.status(200).json({ ok: true })
  }catch(e){
    const msg = String(e?.message||e)
    if(msg.includes('Failed query')) return res.status(500).json({ error: "Erro ao conectar ao banco de dados. Verifique a configuração." })
    return res.status(500).json({ error: "Erro ao solicitar reset. Tente novamente." })
  }
}