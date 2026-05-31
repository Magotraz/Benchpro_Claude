/**
 * BenchPro DB Setup
 * -----------------
 * 1. Creates all 7 auth users in Supabase with fixed UUIDs (Admin API)
 * 2. Runs seed.sql via the Supabase Management API
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=<key> SUPABASE_ACCESS_TOKEN=<token> node scripts/setup-db.mjs
 *
 * Where to get each secret:
 *   SERVICE_ROLE_KEY  → Supabase Dashboard → Project Settings → API → service_role key
 *   ACCESS_TOKEN      → https://supabase.com/dashboard/account/tokens  (create a new token)
 */

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ── Config ────────────────────────────────────────────────────────────────────
const PROJECT_REF    = 'cjytgxjwiazgdqnhqsfm'
const SUPABASE_URL   = `https://${PROJECT_REF}.supabase.co`
const SERVICE_ROLE   = process.env.SUPABASE_SERVICE_ROLE_KEY
const ACCESS_TOKEN   = process.env.SUPABASE_ACCESS_TOKEN
const PASSWORD       = 'BenchPro@2026'

const USERS = [
  { id: '00000000-0000-cafe-0001-000000000000', email: 'recruiter@benchpro.in' },
  { id: '00000000-0000-cafe-0002-000000000000', email: 'client@benchpro.in'    },
  { id: '00000000-0000-cafe-0003-000000000000', email: 'techcorp@benchpro.in'  },
  { id: '00000000-0000-cafe-0004-000000000000', email: 'acme@benchpro.in'      },
  { id: '00000000-0000-cafe-0005-000000000000', email: 'startup@benchpro.in'   },
  { id: '00000000-0000-cafe-0006-000000000000', email: 'dataviz@benchpro.in'   },
  { id: '00000000-0000-cafe-0007-000000000000', email: 'fintech@benchpro.in'   },
]

// ── Helpers ───────────────────────────────────────────────────────────────────
function checkEnv() {
  const missing = []
  if (!SERVICE_ROLE)  missing.push('SUPABASE_SERVICE_ROLE_KEY')
  if (!ACCESS_TOKEN)  missing.push('SUPABASE_ACCESS_TOKEN')
  if (missing.length) {
    console.error('\nMissing required environment variables:')
    missing.forEach(v => console.error(`  ${v}`))
    console.error('\nSet them before running:')
    console.error(`  SUPABASE_SERVICE_ROLE_KEY=<key> SUPABASE_ACCESS_TOKEN=<token> node scripts/setup-db.mjs\n`)
    process.exit(1)
  }
}

// ── Step 1: Create auth users ─────────────────────────────────────────────────
async function createUsers() {
  console.log('\n── Step 1: Creating auth users ──────────────────────────────')
  let created = 0, skipped = 0, failed = 0

  for (const user of USERS) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'apikey':        SERVICE_ROLE,
        'Authorization': `Bearer ${SERVICE_ROLE}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        id:            user.id,
        email:         user.email,
        password:      PASSWORD,
        email_confirm: true,
      }),
    })

    if (res.ok) {
      console.log(`  ✓  Created  ${user.email}`)
      created++
      continue
    }

    const body = await res.json().catch(() => ({}))
    const msg  = body?.msg ?? body?.message ?? res.statusText

    // 422 with "already been registered" means the user exists — safe to skip
    if (res.status === 422 && /already/i.test(msg)) {
      console.log(`  –  Exists   ${user.email} (skipping)`)
      skipped++
    } else {
      console.error(`  ✗  Failed   ${user.email}: ${msg}`)
      failed++
    }
  }

  console.log(`\n  Created: ${created}  Skipped: ${skipped}  Failed: ${failed}`)
  if (failed > 0) {
    throw new Error(`${failed} user(s) failed to create — fix errors above before continuing.`)
  }
}

// ── Step 2: Run seed.sql ──────────────────────────────────────────────────────
async function runSeed() {
  console.log('\n── Step 2: Running seed.sql ─────────────────────────────────')

  const seedPath = join(__dirname, '..', 'seed.sql')
  const sql = readFileSync(seedPath, 'utf8')
  console.log(`  Reading ${seedPath} (${(sql.length / 1024).toFixed(1)} KB)`)

  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({ query: sql }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Management API returned ${res.status}: ${err}`)
  }

  const result = await res.json()

  // The last statement in seed.sql is a SELECT COUNT(*) summary row
  const summary = Array.isArray(result) ? result[result.length - 1] : result
  console.log('\n  Seed counts:')
  for (const [key, val] of Object.entries(summary ?? {})) {
    console.log(`    ${key.padEnd(22)} ${val}`)
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('BenchPro DB Setup')
  console.log(`Project: ${PROJECT_REF}`)
  checkEnv()

  await createUsers()
  await runSeed()

  console.log('\n✓ Setup complete — all users created and seed data loaded.\n')
}

main().catch(err => {
  console.error(`\n✗ Setup failed: ${err.message}\n`)
  process.exit(1)
})
