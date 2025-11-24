import 'dotenv/config'
import { client } from '../src/db.js'

async function run() {
  const sql = `
    DROP SCHEMA IF EXISTS drizzle CASCADE;
    DROP TABLE IF EXISTS mcp_audit_logs CASCADE;
    DROP TABLE IF EXISTS mcp_tokens CASCADE;
    DROP TABLE IF EXISTS mcp_service_connections CASCADE;
    DROP TABLE IF EXISTS mcp_service_providers CASCADE;
    DROP TABLE IF EXISTS mcp_users CASCADE;
  `
  await client.unsafe(sql)
  console.log('Dropped mcp_* tables and drizzle schema')
}

run().then(()=>process.exit(0)).catch(e=>{ console.error(e); process.exit(1) })