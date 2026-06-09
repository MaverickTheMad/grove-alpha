/**
 * One-time migration TEMPLATE (GROVE-ALPHA-BUILD-GUIDE §9 step 3).
 *
 * Reads a legacy app's relational rows from its own schema in reilly-home and
 * packs each into a grove.records row:
 *   { app, type, occurred_at, payload = the rest as JSON, enc=false, household_id }
 *
 * Idempotent: skip rows already migrated (we tag payload._src with the legacy id).
 * Run with the SERVICE ROLE key in a trusted server/CLI context ONLY — never the
 * browser bundle. Usage:
 *
 *   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/migrate-journal.js
 *
 * Copy this file per app (migrate-pantry.js, migrate-ledger.js, ...) and map each
 * legacy table → a record `type`.
 */
import { createClient } from '@supabase/supabase-js'

const HOUSEHOLD_ID = '00000000-0000-0000-0000-000000000001' // matches identity.js alpha
const APP = 'journal'

const url = process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_KEY
if (!url || !serviceKey) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_KEY'); process.exit(1)
}

const legacy = createClient(url, serviceKey, { db: { schema: 'journal' } })
const grove = createClient(url, serviceKey, { db: { schema: 'grove' } })

// legacy table → { type, occurredAt(row), payload(row) }
const MAP = [
  { table: 'symptom_events', type: 'symptom_event',
    occurredAt: (r) => r.occurred_at,
    payload: (r) => ({ symptom: r.symptom, severity: r.severity, notes: r.notes }) },
  { table: 'food_events', type: 'food_event',
    occurredAt: (r) => r.occurred_at,
    payload: (r) => ({ category: r.category, item: r.item, notes: r.notes }) },
  { table: 'mood_events', type: 'mood_event',
    occurredAt: (r) => r.occurred_at,
    payload: (r) => ({ mood: r.mood, notes: r.notes }) },
  { table: 'water_events', type: 'water_event',
    occurredAt: (r) => r.occurred_at,
    payload: (r) => ({ amountOz: r.amount_oz }) },
  { table: 'exercise_events', type: 'exercise_event',
    occurredAt: (r) => r.occurred_at,
    payload: (r) => ({ exerciseType: r.exercise_type, minutes: r.duration_minutes, notes: r.notes }) },
  { table: 'cycle_days', type: 'cycle_day',
    occurredAt: (r) => `${r.date}T12:00:00Z`,
    payload: (r) => ({ date: r.date, flow: r.flow, cyclePhaseOverride: r.cycle_phase_override, sleepHours: r.sleep_hours, notes: r.notes }) },
  { table: 'period_starts', type: 'period_start',
    occurredAt: (r) => `${r.start_date}T12:00:00Z`,
    payload: (r) => ({ date: r.start_date }) },
]

async function alreadyMigrated(srcKey) {
  const { count } = await grove.from('records').select('id', { count: 'exact', head: true })
    .eq('app', APP).contains('payload', { _src: srcKey })
  return (count ?? 0) > 0
}

async function run() {
  for (const m of MAP) {
    const { data: rows, error } = await legacy.from(m.table).select('*')
    if (error) { console.error(`read ${m.table}:`, error.message); continue }
    let inserted = 0
    for (const r of rows) {
      const srcKey = `${m.table}:${r.id ?? r.date ?? r.start_date}`
      if (await alreadyMigrated(srcKey)) continue
      const payload = { ...m.payload(r), _src: srcKey }
      const { error: insErr } = await grove.from('records').insert({
        household_id: HOUSEHOLD_ID, app: APP, type: m.type,
        occurred_at: m.occurredAt(r), payload, enc: false,
      })
      if (insErr) console.error(`insert ${srcKey}:`, insErr.message)
      else inserted++
    }
    console.log(`${m.table} → ${m.type}: +${inserted} (of ${rows.length})`)
  }
  console.log('done.')
}
run()
