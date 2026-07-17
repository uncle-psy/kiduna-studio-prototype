/**
 * Custom Payload migration runner — bypasses the CLI's tsImport issues on Node 24 / Windows.
 * Loads .env.local before initialising Payload so credentials are available.
 * Usage: npm run payload:migrate
 */
import { loadEnvConfig } from '@next/env'
import { getPayload } from 'payload'
import config from './payload.config'

// Load .env.local / .env.development etc. before reading process.env
loadEnvConfig(process.cwd(), true)

async function main() {
  console.log('Running Payload migrations…')
  const payload = await getPayload({ config, disableOnInit: true })
  await payload.db.migrate()
  console.log('Migrations complete.')
  process.exit(0)
}

main().catch((err) => {
  console.error('Migration error:', err?.message ?? err)
  process.exit(1)
})
