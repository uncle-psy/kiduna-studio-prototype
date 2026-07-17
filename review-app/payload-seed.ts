/**
 * Bootstrap the Payload admin user.
 * Run once after the first `npm run payload:migrate`:
 *   npm run payload:seed
 */
import { getPayload } from 'payload'
import config from './payload.config'

async function seed() {
  const payload = await getPayload({ config })

  const adminEmail    = process.env.PAYLOAD_ADMIN_EMAIL    || 'admin@kiduna.studio'
  const adminPassword = process.env.PAYLOAD_ADMIN_PASSWORD || 'change-me-admin-password'
  const adminApiKey   = process.env.PAYLOAD_ADMIN_API_KEY  || 'change-me-admin-api-key'

  const existing = await payload.find({
    collection: 'cms-users',
    where: { email: { equals: adminEmail } },
    limit: 1,
  })

  if (existing.totalDocs > 0) {
    payload.logger.info('[Seed] Admin user already exists — skipping')
    process.exit(0)
  }

  await payload.create({
    collection: 'cms-users',
    data: {
      email:         adminEmail,
      password:      adminPassword,
      roles:         ['super-admin'],
      apiKey:        adminApiKey,
      enableAPIKey:  true,
    },
  })

  payload.logger.info(`[Seed] Admin user created: ${adminEmail}`)
  payload.logger.info(`[Seed] API key set — value comes from PAYLOAD_ADMIN_API_KEY env var`)
  payload.logger.info('[Seed] Done. You can now start the dev server.')
  process.exit(0)
}

seed().catch((err) => {
  console.error('[Seed] Fatal error:', err)
  process.exit(1)
})
