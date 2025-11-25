import assert from 'node:assert/strict'
import { createConnection, getConnection, revokeConnection, rotateToken } from '../src/handlers/connections.js'
import { resolveMcpServer } from '../src/handlers/mcp.js'

async function run(){
  const created = await createConnection({ userId: 1, providerKey: 'wordpress', name: 'Unit WP', config: { url: 'https://example.com' }, secrets: { username: 'admin', app_password: 'app-pass' } })
  assert.ok(created.id, 'deve criar conexão')
  assert.ok(created.token, 'token deve existir')

  let c = await getConnection(created.id)
  assert.equal(c.status, 'active')
  assert.ok(c.token)

  await revokeConnection(created.id)
  c = await getConnection(created.id)
  assert.equal(c.status, 'revoked')

  const rotated = await rotateToken(created.id)
  assert.ok(rotated.token)
  c = await getConnection(created.id)
  assert.equal(c.status, 'active')
  assert.equal(rotated.token.slice(-4), c.token_last4)

  const resolved = await resolveMcpServer('wordpress', rotated.token)
  assert.ok(resolved.server, 'server MCP deve estar resolvido com token válido')

  console.log('Handlers unit tests OK')
}

run().catch((e)=>{ const msg = String(e?.cause?.code||e?.code||''); if(msg==='ECONNREFUSED'){ console.log('DB indisponível, pulando testes unitários'); process.exit(0) } console.error(e); process.exit(1) })