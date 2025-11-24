import { test, expect } from '@playwright/test'

test('Cria conexão WordPress e lista com token visível', async ({ request }) => {
  const baseURL = process.env.BASE_URL || 'http://localhost:3001'
  const create = await request.post(`${baseURL}/api/connections`, {
    data: { provider: 'wordpress', name: 'WP Test', config: { url: 'https://example.com' }, secrets: { username: 'admin', app_password: 'app-pass' } }
  })
  expect(create.ok()).toBeTruthy()
  const created = await create.json()
  expect(created.token).toBeTruthy()
  const list = await request.get(`${baseURL}/api/connections`)
  expect(list.ok()).toBeTruthy()
  const data = await list.json()
  const item = (data.items||[]).find((x:any)=>x.name==='WP Test')
  expect(item).toBeTruthy()
  expect(item.token).toBeTruthy()
  expect(item.secrets?.username).toBe('admin')
})

test('Rotaciona e revoga token da conexão', async ({ request }) => {
  const baseURL = process.env.BASE_URL || 'http://localhost:3001'
  const create = await request.post(`${baseURL}/api/connections`, {
    data: { provider: 'wordpress', name: 'WP Rotate', config: { url: 'https://example.com' }, secrets: { username: 'admin', app_password: 'app-pass' } }
  })
  const created = await create.json()
  const id = created.id
  const rot = await request.post(`${baseURL}/api/connections/${id}/rotate-token`)
  expect(rot.ok()).toBeTruthy()
  const rotated = await rot.json()
  expect(rotated.token).toBeTruthy()
  const list = await request.get(`${baseURL}/api/connections`)
  const items = (await list.json()).items
  const item = items.find((x:any)=>x.id===id)
  expect(item.token).toBeTruthy()
  const rev = await request.post(`${baseURL}/api/connections/${id}/revoke`)
  expect(rev.ok()).toBeTruthy()
  const one = await request.get(`${baseURL}/api/connections/${id}`)
  const data = await one.json()
  expect(data.status).toBe('revoked')
})