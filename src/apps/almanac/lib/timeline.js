// The cross-app aggregator. The legacy app used a Postgres view (v_timeline)
// that UNIONed the other schemas; in Grove everything is in grove.records, so we
// read each app's records and map them to the same normalized timeline shape:
//   { source, ref_id, title, event_date, event_time, amount, kind, meta }
// Sources mirror the old view: paydays + goal targets (ledger), period actuals +
// predictions (journal), pet reminders/vaccines/meds/visits (pets), planned meals
// (pantry), Almanac's own events, and Google Calendar via the read-only proxy.

import * as db from '../../../lib/data'
import { members } from '../../../lib/identity'
import { predictNextPeriod, expandMealPlan, weekBounds, normalizeRow } from '../constants'

const memberName = (id) => members().find((m) => m.id === id)?.name || null

export async function loadTimeline(rangeStart, rangeEnd) {
  const safe = (p) => p.then((r) => r || []).catch(() => [])
  const [
    paychecks, goals, periodStarts,
    petReminders, vaccinations, medications, vetVisits, pets,
    recipes, states, events,
  ] = await Promise.all([
    safe(db.list({ app: 'ledger', type: 'paycheck' })),
    safe(db.list({ app: 'ledger', type: 'goal' })),
    safe(db.list({ app: 'journal', type: 'period_start' })),
    safe(db.list({ app: 'pets', type: 'reminder' })),
    safe(db.list({ app: 'pets', type: 'vaccination' })),
    safe(db.list({ app: 'pets', type: 'medication' })),
    safe(db.list({ app: 'pets', type: 'vet_visit' })),
    safe(db.list({ app: 'pets', type: 'pet' })),
    safe(db.list({ app: 'pantry', type: 'recipe' })),
    safe(db.list({ app: 'pantry', type: 'shopping_state' })),
    safe(db.list({ app: 'almanac', type: 'event' })),
  ])

  const inRange = (d) => d && d >= rangeStart && d <= rangeEnd
  const petName = (pid) => pets.find((p) => p.id === pid)?.data?.name
  const rows = []

  // ── Ledger: paydays + goal targets ──────────────────────────────────────────
  for (const r of paychecks) {
    const d = r.data.next_date
    if (!inRange(d)) continue
    const person = memberName(r.data.person_id)
    rows.push({ source: 'payday', ref_id: r.id, title: `${person || r.data.label || 'Paycheck'} paycheck`, event_date: d, event_time: null, amount: r.data.amount, kind: 'payday', meta: { cadence: r.data.cadence, person } })
  }
  for (const r of goals) {
    const d = r.data.target_date
    if (!inRange(d) || r.data.archived) continue
    rows.push({ source: 'goal', ref_id: r.id, title: `${r.data.name} target`, event_date: d, event_time: null, amount: r.data.target_amount, kind: 'goal', meta: { current: r.data.current_amount } })
  }

  // ── Journal: period actuals + predicted ─────────────────────────────────────
  const startDates = periodStarts.map((r) => r.data.start_date).filter(Boolean)
  for (const d of startDates) {
    if (inRange(d)) rows.push({ source: 'period', ref_id: `ps-${d}`, title: 'Period start', event_date: d, event_time: null, amount: null, kind: 'flow', meta: {} })
  }
  for (const d of predictNextPeriod(startDates, 3)) {
    if (inRange(d)) rows.push({ source: 'period', ref_id: `pred-${d}`, title: 'Period (predicted)', event_date: d, event_time: null, amount: null, kind: 'predicted_flow', meta: { predicted: true } })
  }

  // ── Pets: reminders, vaccines, med refills, vet visits ──────────────────────
  for (const r of petReminders) {
    const d = r.data.due_date
    if (r.data.done || !inRange(d)) continue
    rows.push({ source: 'pet', ref_id: r.id, title: r.data.title || 'Reminder', event_date: d, event_time: null, amount: null, kind: 'pet', meta: { pet: petName(r.data.pet_id), type: 'reminder' } })
  }
  for (const r of vaccinations) {
    const d = r.data.next_due
    if (!inRange(d)) continue
    rows.push({ source: 'pet', ref_id: r.id, title: `${r.data.name} vaccine`, event_date: d, event_time: null, amount: null, kind: 'pet', meta: { pet: petName(r.data.pet_id), type: 'vaccine' } })
  }
  for (const r of medications) {
    const d = r.data.refill_due
    if (r.data.active === false || !inRange(d)) continue
    rows.push({ source: 'pet', ref_id: r.id, title: `${r.data.name} refill`, event_date: d, event_time: null, amount: null, kind: 'pet', meta: { pet: petName(r.data.pet_id), type: 'medication' } })
  }
  for (const r of vetVisits) {
    const d = r.data.visit_date
    if (!inRange(d)) continue
    rows.push({ source: 'pet', ref_id: r.id, title: 'Vet visit', event_date: d, event_time: null, amount: r.data.cost ?? null, kind: 'pet', meta: { pet: petName(r.data.pet_id), type: 'visit' } })
  }

  // ── Pantry: planned meals (expand the offset-keyed meal_plan) ────────────────
  const state = states[0]?.data
  if (state?.meal_plan) {
    const byId = Object.fromEntries(recipes.map((r) => [r.id, { id: r.id, name: r.data.name, servings: r.data.servings }]))
    for (const m of expandMealPlan(state.meal_plan, byId, weekBounds().start)) {
      if (inRange(m.event_date)) rows.push(m)
    }
  }

  // ── Almanac's own events ────────────────────────────────────────────────────
  for (const r of events) {
    const d = r.data.event_date
    if (!inRange(d)) continue
    rows.push({ source: 'almanac', ref_id: r.id, title: r.data.title, event_date: d, event_time: r.data.event_time || null, amount: r.data.amount ?? null, kind: r.data.kind || 'family', meta: { notes: r.data.notes } })
  }

  // ── Google Calendar (read-only proxy; skipped if not deployed) ──────────────
  let gcal = []
  try {
    const res = await fetch(`/api/gcal?start=${rangeStart}&end=${rangeEnd}`)
    if (res.ok) {
      const data = await res.json()
      gcal = (data.events || []).map((e) => ({ source: 'gcal', ref_id: e.uid, title: e.title, event_date: e.date, event_time: e.start || null, amount: null, kind: 'gcal', meta: { location: e.location } }))
    }
  } catch { /* proxy not available — fine */ }

  return [...rows, ...gcal].map(normalizeRow)
}
