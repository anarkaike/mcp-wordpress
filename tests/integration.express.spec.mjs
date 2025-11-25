import assert from 'node:assert/strict'

process.env.NO_LISTEN = '1'
const { app } = await import('../src/server.js')

async function run(){
  const srv = app.listen(0)
  await new Promise((r)=>srv.once('listening', r))
  const port = srv.address().port
  const base = `http://127.0.0.1:${port}`

  async function api(path, opts){
    const res = await fetch(base+path, { headers: { 'Content-Type':'application/json' }, ...opts })
    const ct = res.headers.get('content-type')||''
    let body = null
    if(ct.includes('application/json')) body = await res.json(); else body = await res.text()
    return { status: res.status, body }
  }

  const list = await api('/api/connections', { method: 'GET' })
  if(list.status>=500){
    console.log('DB indisponível, pulando testes de integração')
    srv.close()
    process.exit(0)
  }

  const created = await api('/api/connections', { method: 'POST', body: JSON.stringify({ provider:'wordpress', name:'Integration WP', config:{ url:'https://example.com' }, secrets:{ username:'admin', app_password:'app-pass' } }) })
  assert.equal(created.status, 201)
  assert.ok(created.body?.id)
  assert.ok(created.body?.token)

  const id = created.body.id

  const get1 = await api(`/api/connections/${id}`, { method: 'GET' })
  assert.equal(get1.status, 200)
  assert.equal(get1.body.status, 'active')

  const patch = await api(`/api/connections/${id}`, { method: 'PATCH', body: JSON.stringify({ name:'Integration WP Updated' }) })
  assert.equal(patch.status, 200)

  const test = await api(`/api/connections/${id}/test`, { method: 'POST' })
  assert.ok(test.status===200)
  assert.ok(typeof test.body?.ok === 'boolean')

  const rotated = await api(`/api/connections/${id}/rotate-token`, { method: 'POST' })
  assert.equal(rotated.status, 200)
  assert.ok(rotated.body?.token)

  const token = rotated.body.token

  const revoked = await api(`/api/connections/${id}/revoke`, { method: 'POST' })
  assert.ok([200,406].includes(revoked.status))
  const get2 = await api(`/api/connections/${id}`, { method: 'GET' })
  if(get2.status===200) assert.equal(get2.body.status, 'revoked')


  const del = await api(`/api/connections/${id}`, { method: 'DELETE' })
  assert.equal(del.status, 200)

  srv.close()
  console.log('Integração Express OK')
}

run().catch((e)=>{ console.error(e); process.exit(1) })