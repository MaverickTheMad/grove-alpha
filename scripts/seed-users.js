/**
 * Pre-seed the two alpha accounts (Ren + Mav) in Supabase Auth.
 *
 * Alpha has NO open sign-up, so accounts are created here once via the admin
 * API with the SERVICE ROLE key (server/CLI only — never the browser bundle).
 * Usernames map to synthetic emails (`<username>@<domain>`) and are created
 * already confirmed, so no mail delivery is needed.
 *
 * Usage:
 *   SUPABASE_URL=... \
 *   SUPABASE_SERVICE_KEY=... \
 *   AUTH_EMAIL_DOMAIN=grove.reilly.live \
 *   REN_PASSWORD='...' MAV_PASSWORD='...' \
 *   node scripts/seed-users.js
 *
 * Idempotent: existing users are updated (password reset) rather than duplicated.
 */
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_KEY
const DOMAIN = process.env.AUTH_EMAIL_DOMAIN || 'grove.reilly.live'
const HOUSEHOLD_ID = '00000000-0000-0000-0000-000000000001' // matches identity.js

if (!url || !serviceKey) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_KEY'); process.exit(1)
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const USERS = [
  { username: 'ren', name: 'Ren', member_id: 'ren', password: process.env.REN_PASSWORD },
  { username: 'mav', name: 'Mav', member_id: 'mav', password: process.env.MAV_PASSWORD },
]

const emailFor = (u) => `${u}@${DOMAIN}`

async function findByEmail(email) {
  // listUsers is paginated; fine for a 2-user household
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (error) throw error
  return data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
}

async function run() {
  for (const u of USERS) {
    if (!u.password) { console.error(`Missing ${u.username.toUpperCase()}_PASSWORD — skipping`); continue }
    const email = emailFor(u.username)
    const user_metadata = { username: u.username, name: u.name, member_id: u.member_id }
    const app_metadata = { household_id: HOUSEHOLD_ID } // admin-set, not user-editable (used by beta RLS)

    const existing = await findByEmail(email)
    if (existing) {
      await admin.auth.admin.updateUserById(existing.id, {
        password: u.password, user_metadata, app_metadata, email_confirm: true,
      })
      console.log(`updated ${u.username} (${email})`)
    } else {
      await admin.auth.admin.createUser({
        email, password: u.password, email_confirm: true, user_metadata, app_metadata,
      })
      console.log(`created ${u.username} (${email})`)
    }
  }
  console.log('done. Sign in with the username (e.g. "ren"), not the email.')
}
run().catch((e) => { console.error(e); process.exit(1) })
