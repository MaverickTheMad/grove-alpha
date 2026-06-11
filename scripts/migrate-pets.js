/**
 * One-time migration: Grove · Pets (`pets` schema) -> grove.records.
 * Idempotent via payload._src. Run with the SERVICE ROLE key, server-side.
 *   grant usage on schema pets to service_role;
 *   grant select on all tables in schema pets to service_role;
 *
 *   export SUPABASE_URL="https://ceomcgjbizynplactgiq.supabase.co"
 *   export SUPABASE_SERVICE_KEY="<service_role key>"
 *   node scripts/migrate-pets.js
 *
 * Every row keeps its uuid id so pet_id / visit_id foreign keys (resolved
 * client-side) keep pointing at the right records. Storage files (pet-docs
 * bucket) are untouched — their public URLs are already in the document/pet rows.
 */
import { createClient } from '@supabase/supabase-js'

const HOUSEHOLD_ID = '00000000-0000-0000-0000-000000000001'
const APP = 'pets'
const LEGACY_SCHEMA = process.env.LEGACY_SCHEMA || 'pets'

const url = process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_KEY
if (!url || !serviceKey) { console.error('Set SUPABASE_URL and SUPABASE_SERVICE_KEY'); process.exit(1) }

const opts = { auth: { persistSession: false, autoRefreshToken: false } }
const legacy = createClient(url, serviceKey, { db: { schema: LEGACY_SCHEMA }, ...opts })
const grove = createClient(url, serviceKey, { db: { schema: 'grove' }, ...opts })

// All pets tables are uuid-keyed; keep ids so FKs survive. occurred_at unused
// (pets queries are by pet_id + payload dates, not occurred_at ranges).
const TABLES = [
  { table: 'pets', type: 'pet' },
  { table: 'weight_logs', type: 'weight_log' },
  { table: 'vaccinations', type: 'vaccination' },
  { table: 'medications', type: 'medication' },
  { table: 'conditions', type: 'condition' },
  { table: 'vet_visits', type: 'vet_visit' },
  { table: 'documents', type: 'document' },
  { table: 'reminders', type: 'reminder' },
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
async function insert(type, payload, id) {
  const rec = { household_id: HOUSEHOLD_ID, app: APP, type, occurred_at: null, payload, enc: false, id }
  const { error } = await grove.from('records').insert(rec)
  if (error) { console.error(`  ✗ insert ${type}: ${error.message}`); return false }
  return true
}
async function preflight() {
  console.log('Preflight checks…')
  for (const [client, label, table] of [[grove, 'grove', 'records'], [legacy, LEGACY_SCHEMA, 'pets']]) {
    const { error } = await client.from(table).select('id').limit(1)
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
  for (const { table, type } of TABLES) {
    const rows = await read(table)
    if (!rows) continue
    let n = 0
    for (const row of rows) {
      const src = `${table}:${row.id}`
      if (await alreadyMigrated(src)) continue
      const { id, created_at, updated_at, ...rest } = row
      const payload = { ...rest, _src: src }
      if (await insert(type, payload, id)) n++
    }
    console.log(`  ${table} -> ${type}: +${n} (of ${rows.length})`)
  }
  console.log('\nDone.')
  process.exit(0)
}
run().catch((e) => { console.error('Fatal:', e.message); process.exit(1) })
