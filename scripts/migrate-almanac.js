/**
 * One-time migration: Almanac (`almanac` schema) -> grove.records.
 * Only the almanac.events table needs migrating — everything else on the
 * timeline is read live from the other apps' records. Run LAST, after the
 * other apps are migrated. Idempotent via payload._src.
 *   grant usage on schema almanac to service_role;
 *   grant select on all tables in schema almanac to service_role;
 *
 *   export SUPABASE_URL="https://ceomcgjbizynplactgiq.supabase.co"
 *   export SUPABASE_SERVICE_KEY="<service_role key>"
 *   node scripts/migrate-almanac.js
 */
import { createClient } from '@supabase/supabase-js'

const HOUSEHOLD_ID = '00000000-0000-0000-0000-000000000001'
const APP = 'almanac'
const LEGACY_SCHEMA = process.env.LEGACY_SCHEMA || 'almanac'

const url = process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_KEY
if (!url || !serviceKey) { console.error('Set SUPABASE_URL and SUPABASE_SERVICE_KEY'); process.exit(1) }

const opts = { auth: { persistSession: false, autoRefreshToken: false } }
const legacy = createClient(url, serviceKey, { db: { schema: LEGACY_SCHEMA }, ...opts })
const grove = createClient(url, serviceKey, { db: { schema: 'grove' }, ...opts })

async function alreadyMigrated(srcKey) {
  const { count, error } = await grove.from('records').select('id', { count: 'exact', head: true }).eq('app', APP).contains('payload', { _src: srcKey })
  if (error) { console.error(`  ✗ check grove.records: ${error.message}`); return false }
  return (count ?? 0) > 0
}
async function preflight() {
  console.log('Preflight checks…')
  for (const [client, label, table] of [[grove, 'grove', 'records'], [legacy, LEGACY_SCHEMA, 'events']]) {
    const { error } = await client.from(table).select('id').limit(1)
    if (error) {
      console.error(`  ✗ cannot reach ${label}.${table}: ${error.message} (${error.code || ''})`)
      console.error(`    → 42501: grant service_role usage+select on the ${label} schema. PGRST106: expose the schema.`)
      return false
    }
    console.log(`  ✓ ${label}.${table} reachable`)
  }
  return true
}
async function run() {
  if (!(await preflight())) { console.error('\nPreflight failed — nothing written.'); process.exit(1) }
  console.log('\nMigrating almanac.events…')
  const { data: rows, error } = await legacy.from('events').select('*')
  if (error) { console.error('read failed:', error.message); process.exit(1) }
  let n = 0
  for (const row of rows || []) {
    const src = `events:${row.id}`
    if (await alreadyMigrated(src)) continue
    const { id, created_at, updated_at, ...rest } = row
    const occurred_at = rest.event_time || (rest.event_date ? `${rest.event_date}T12:00:00Z` : null)
    const { error: insErr } = await grove.from('records').insert({
      id, household_id: HOUSEHOLD_ID, app: APP, type: 'event',
      occurred_at, payload: { ...rest, _src: src }, enc: false,
    })
    if (insErr) { console.error(`  ✗ insert: ${insErr.message}`); continue }
    n++
  }
  console.log(`  events -> event: +${n} (of ${(rows || []).length})`)
  console.log('\nDone.')
  process.exit(0)
}
run().catch((e) => { console.error('Fatal:', e.message); process.exit(1) })
