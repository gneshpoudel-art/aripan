import pg from 'pg'
import fs from 'node:fs'
import path from 'node:path'

// Allow self-signed or proxy TLS certs for migration
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const { Client } = pg

const projectRef = 'lnsixscoxrinvresoydn'
const password = process.env.SUPABASE_PASSWORD || 'ganeshPoudel123@'

const connectionConfigs = [
  {
    name: 'Session Pooler (port 5432)',
    host: 'aws-0-ap-southeast-1.pooler.supabase.com',
    port: 5432,
    user: `postgres.${projectRef}`,
    password,
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  },
  {
    name: 'Transaction Pooler (port 6543)',
    host: 'aws-0-ap-southeast-1.pooler.supabase.com',
    port: 6543,
    user: `postgres.${projectRef}`,
    password,
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  },
  {
    name: 'Direct Supabase DB (port 5432)',
    host: `db.${projectRef}.supabase.co`,
    port: 5432,
    user: 'postgres',
    password,
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  }
]

async function run() {
  const schemaPath = path.resolve(process.cwd(), 'supabase', 'schema.sql')
  const sql = fs.readFileSync(schemaPath, 'utf8')

  let connectedClient: pg.Client | null = null

  for (const cfg of connectionConfigs) {
    console.log(`Attempting connection to ${cfg.name} (${cfg.host}:${cfg.port})...`)
    const client = new Client(cfg)

    try {
      await client.connect()
      console.log(`✅ Connected successfully via ${cfg.name}!`)
      connectedClient = client
      break
    } catch (err: any) {
      console.log(`❌ Failed connecting to ${cfg.name}: ${err.message}`)
      try { await client.end() } catch {}
    }
  }

  if (!connectedClient) {
    console.log('\n⚠️ Direct PostgreSQL connection could not be established.')
    process.exit(1)
  }

  try {
    console.log('\nExecuting schema.sql...')
    await connectedClient.query(sql)
    console.log('🎉 Schema applied successfully to Supabase!')
  } catch (err: any) {
    console.error('Error executing SQL:', err.message)
    process.exit(1)
  } finally {
    await connectedClient.end()
  }
}

run().catch((err) => {
  console.error('Migration error:', err)
  process.exit(1)
})
