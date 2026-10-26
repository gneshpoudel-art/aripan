import { getDB } from '../server/db.ts'

async function check() {
  const sb = getDB()
  const tables = [
    'products',
    'collections',
    'gallery_works',
    'articles',
    'legal_pages',
    'admin_users',
    'admin_roles',
    'admin_role_permissions',
    'admin_audit_logs',
    'customers',
    'customer_addresses',
    'customer_cart',
    'customer_wishlist',
    'customer_data_requests',
    'orders',
    'payment_attempts',
    'commission_enquiries',
    'events',
    'site_settings',
    'site_content_blocks',
    'media_assets',
    'page_seo_meta',
    'system_health'
  ]

  console.log('\n--- Checking Supabase Tables ---')
  let existingCount = 0
  let missingCount = 0

  for (const t of tables) {
    const { data, error } = await sb.from(t).select('*').limit(1)
    if (error) {
      console.log(`❌ Table "${t}": MISSING (${error.message})`)
      missingCount++
    } else {
      console.log(`✅ Table "${t}": EXISTS (sample rows: ${data?.length ?? 0})`)
      existingCount++
    }
  }

  console.log(`\nSummary: ${existingCount} tables exist, ${missingCount} tables missing.`)
  if (missingCount > 0) {
    console.log('\nResult: Schema is NOT fully applied yet.')
  } else {
    console.log('\nResult: Schema IS FULLY applied!')
  }
  process.exit(0)
}

check().catch((err) => {
  console.error('Check failed:', err)
  process.exit(1)
})
