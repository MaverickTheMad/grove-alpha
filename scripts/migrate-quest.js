/**
 * One-time migration: Mav's Quest Log (`quest` schema) -> grove.records.
 * Idempotent via payload._src. Run with the SERVICE ROLE key, server-side.
 *   grant usage on schema quest to service_role;
 *   grant select on all tables in schema quest to service_role;
 *
 *   export SUPABASE_URL="https://ceomcgjbizynplactgiq.supabase.co"
 *   export SUPABASE_SERVICE_KEY="<service_role key>"
 *   node scripts/migrate-quest.js
 *
 * Event rows keep their uuid id. game_state (single 'current' row) and
 * habit_completions (composite date+habit_id key) get fresh ids.
 */
import { createClient } from '@supabase/supabase-js'

const HOUSEHOLD_ID = '00000000-0000-0000-0000-000000000001'
const APP = 'quest'
const LEGACY_SCHEMA = process.env.LEGACY_SCHEMA || 'quest'

const url = process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_KEY
if (!url || !serviceKey) { console.error('Set SUPABASE_URL and SUPABASE_SERVICE_KEY'); process.exit(1) }

const opts = { auth: { persistSession: false, autoRefreshToken: false } }
const legacy = createClient(url, serviceKey, { db: { schema: LEGACY_SCHEMA }, ...opts })
const grove = createClient(url, serviceKey, { db: { schema: 'grove' }, ...opts })

const TABLES = [
  { table: 'game_state', type: 'game_state', occ: () => null, key: () => 'current', keepId: false },
  { table: 'habit_completions', type: 'habit_completion', occ: (r) => `${r.date}T12:00:00Z`, key: (r) => `${r.date}:${r.habit_id}`, keepId: false },
  { table: 'mood_events', type: 'mood_event', occ: (r) => r.occurred_at, key: (r) => r.id, keepId: true },
  { table: 'food_events', type: 'food_event', occ: (r) => r.occurred_at, key: (r) => r.id, keepId: true },
  { table: 'water_events', type: 'water_event', occ: (r) => r.occurred_at, key: (r) => r.id, keepId: true },
  { table: 'exercise_events', type: 'exercise_event', occ: (r) => r.occurred_at, key: (r) => r.id, keepId: true },
  { table: 'sleep_events', type: 'sleep_event', occ: (r) => r.occurred_at, key: (r) => r.id, keepId: true },
]

function dumpError(label, err) {
  console.error(`  ✗ ${label}`)
  console.error(`      message: ${err.message || '(empty)'} | code: ${err.code || '(none)'} | hint: ${err.hint || '(none)'}`)
}
async function read(table) {
  const { data, error } = await legacy.from(table).select('*')
  if (error) { console.error(`  ✗ read ${LEGACY_SCHEMA}.${table}: ${error.message} (${error.code || ''})`); return null }
  return data || []
}
async function alreadyMigrated(srcKey) {
  const { count, error } = await grove.from('records').select('id', { count: 'exact', head: true }).eq('app', APP).contains('payload', { _src: srcKey })
  if (error) { console.error(`  ✗ check grove.records: ${error.message}`); return false }
  return (count ?? 0) > 0
}
async function insert(type, payload, occurred_at, id) {
  const rec = { household_id: HOUSEHOLD_ID, app: APP, type, occurred_at: occurred_at || null, payload, enc: false }
  if (id) rec.id = id
  const { error } = await grove.from('records').insert(rec)
  if (error) { console.error(`  ✗ insert ${type}: ${error.message}`); return false }
  return true
}
async function preflight() {
  console.log('Preflight checks…')
  for (const [client, label, table, col] of [[grove, 'grove', 'records', 'id'], [legacy, LEGACY_SCHEMA, 'game_state', 'id']]) {
    const { error } = await client.from(table).select(col).limit(1)
    if (error) {
      dumpError(`cannot reach ${label}.${table}`, error)
      console.error(`    → 42501: grant service_role usage+select on the ${label} schema. PGRST106: expose the schema.`)
      return false
    }
    console.log(`  ✓ ${label}.${table} reachable`)
  }
  return true
}
async function run() {
  if (!(await preflight())) { console.error('\nPreflight failed — nothing written.'); process.exit(1) }
  console.log('\nMigrating…')
  for (const { table, type, occ, key, keepId } of TABLES) {
    const rows = await read(table)
    if (!rows) continue
    let n = 0
    for (const row of rows) {
      const src = `${table}:${key(row)}`
      if (await alreadyMigrated(src)) continue
      const { id, occurred_at, created_at, updated_at, ...rest } = row
      const payload = { ...rest, _src: src }
      if (await insert(type, payload, occ(row), keepId ? id : null)) n++
    }
    console.log(`  ${table} -> ${type}: +${n} (of ${rows.length})`)
  }
  console.log('\nDone.')
  process.exit(0)
}
run().catch((e) => { console.error('Fatal:', e.message); process.exit(1) })
