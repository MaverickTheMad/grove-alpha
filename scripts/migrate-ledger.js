/**
 * One-time migration: budget-app -> grove.records.
 *   - Reads the `budget` schema (all financial tables) and `core` schema (people).
 *   - PRESERVES each row's id as the record id, so cross-references
 *     (transaction.category_id, debt_payments.debt_id, goal_contributions.goal_id,
 *      person.primary_paycheck_id -> paychecks.id, …) keep resolving.
 *   - Maps the old core.people UUIDs to member ids 'mav' / 'ren'.
 *   - person.primary_paycheck_id becomes a `person_settings` record per member.
 *
 * Run with the SERVICE ROLE key, server-side. First grant service_role read on
 * BOTH schemas (SQL editor):
 *   grant usage on schema budget to service_role;
 *   grant select on all tables in schema budget to service_role;
 *   grant usage on schema core to service_role;
 *   grant select on all tables in schema core to service_role;
 *
 *   export SUPABASE_URL="https://ceomcgjbizynplactgiq.supabase.co"
 *   export SUPABASE_SERVICE_KEY="<service_role key>"
 *   node scripts/migrate-ledger.js
 */
import { createClient } from '@supabase/supabase-js'

const HOUSEHOLD_ID = '00000000-0000-0000-0000-000000000001'
const APP = 'ledger'
const LEGACY_SCHEMA = process.env.LEGACY_SCHEMA || 'budget'
const CORE_SCHEMA = process.env.CORE_SCHEMA || 'core'

const url = process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_KEY
if (!url || !serviceKey) { console.error('Set SUPABASE_URL and SUPABASE_SERVICE_KEY'); process.exit(1) }

const opts = { auth: { persistSession: false, autoRefreshToken: false } }
const budget = createClient(url, serviceKey, { db: { schema: LEGACY_SCHEMA }, ...opts })
const core = createClient(url, serviceKey, { db: { schema: CORE_SCHEMA }, ...opts })
const grove = createClient(url, serviceKey, { db: { schema: 'grove' }, ...opts })

// budget table -> record type, plus which fields hold a person reference to remap.
const TABLES = [
  ['paychecks', 'paycheck', ['person_id', 'owner']],
  ['accounts', 'account', []],
  ['categories', 'category', []],
  ['bills', 'bill', []],
  ['bill_payments', 'bill_payment', []],
  ['monthly_budgets', 'monthly_budget', ['person_id']],
  ['transactions', 'transaction', ['person_id']],
  ['goals', 'goal', []],
  ['goal_contributions', 'goal_contribution', []],
  ['debts', 'debt', []],
  ['debt_payments', 'debt_payment', []],
  ['rules', 'rule', []],
  ['statement_imports', 'statement_import', []],
  ['app_settings', 'app_setting', []],
]

function dumpError(label, err) {
  console.error(`  ✗ ${label}`)
  console.error(`      message: ${err.message || '(empty)'}`)
  console.error(`      code:    ${err.code || '(none)'}`)
  console.error(`      hint:    ${err.hint || '(none)'}`)
}
async function read(client, label, table) {
  const { data, error } = await client.from(table).select('*')
  if (error) { console.error(`  ✗ read ${label}.${table}: ${error.message} (${error.code || ''})`); return null }
  return data || []
}
async function alreadyMigrated(srcKey) {
  const { count, error } = await grove.from('records').select('id', { count: 'exact', head: true }).eq('app', APP).contains('payload', { _src: srcKey })
  if (error) { console.error(`  ✗ check grove.records: ${error.message}`); return false }
  return (count ?? 0) > 0
}
async function insert(type, payload, occurred_at = null, id = null) {
  const rec = { household_id: HOUSEHOLD_ID, app: APP, type, occurred_at, payload, enc: false }
  if (id) rec.id = id
  const { error } = await grove.from('records').insert(rec)
  if (error) { console.error(`  ✗ insert ${type} (${id || 'new'}): ${error.message}`); return false }
  return true
}

function buildPersonMap(people) {
  const map = {}
  people.forEach((p, i) => {
    const n = (p.name || '').toLowerCase()
    map[p.id] = n.includes('mav') ? 'mav' : n.includes('ren') ? 'ren' : (i === 0 ? 'mav' : 'ren')
  })
  return map
}

async function preflight() {
  console.log('Preflight checks…')
  for (const [client, label, table] of [[grove, 'grove', 'records'], [budget, LEGACY_SCHEMA, 'categories'], [core, CORE_SCHEMA, 'people']]) {
    const { error } = await client.from(table).select('id').limit(1)
    if (error) {
      dumpError(`cannot reach ${label}.${table}`, error)
      console.error(`    → 42501 permission denied: grant service_role usage+select on the ${label} schema.`)
      console.error('    → PGRST106: that schema is not in Settings → API → Exposed schemas.')
      return false
    }
    console.log(`  ✓ ${label}.${table} reachable`)
  }
  return true
}

async function run() {
  if (!(await preflight())) { console.error('\nPreflight failed — fix the above and re-run. Nothing was written.'); process.exit(1) }

  const people = await read(core, CORE_SCHEMA, 'people')
  if (!people) { console.error('Could not read core.people — aborting.'); process.exit(1) }
  const personMap = buildPersonMap(people)
  console.log('\nPerson map:', JSON.stringify(personMap))

  console.log('\nMigrating budget tables…')
  for (const [table, type, personFields] of TABLES) {
    const rows = await read(budget, LEGACY_SCHEMA, table)
    if (!rows) continue
    let n = 0
    for (const row of rows) {
      const rowId = row.id ?? `${row.bill_id || ''}|${row.due_date || row.period_start || ''}|${row.category_id || ''}`
      const src = `${table}:${rowId}`
      if (await alreadyMigrated(src)) continue
      const { id, ...rest } = row
      for (const f of personFields) {
        if (rest[f] != null && personMap[rest[f]]) rest[f] = personMap[rest[f]]
      }
      const occurred_at = table === 'transactions' && row.date ? new Date(`${row.date}T12:00:00Z`).toISOString() : null
      if (await insert(type, { ...rest, _src: src }, occurred_at, id || null)) n++
    }
    console.log(`  ${table} -> ${type}: +${n} (of ${rows.length})`)
  }

  console.log('\nMigrating people -> person_settings…')
  let ps = 0
  for (const p of people) {
    const mid = personMap[p.id]
    const src = `person_settings:${mid}`
    if (await alreadyMigrated(src)) continue
    if (await insert('person_settings', { person_id: mid, primary_paycheck_id: p.primary_paycheck_id || null, _src: src })) ps++
  }
  console.log(`  person_settings: +${ps} (of ${people.length})`)

  console.log('\nDone.')
  process.exit(0)
}

run().catch((e) => { console.error('Fatal:', e.message); process.exit(1) })
