// Ren's Journal data layer on grove.records. The tabs call this instead of
// Supabase directly. Legacy journal.* tables map to record types:
//   cycle_days        -> 'cycle_day'      (one per date; payload.date is the key)
//   period_starts     -> 'period_start'   (payload.start_date)
//   symptom_events    -> 'symptom_event'  (occurred_at + payload)
//   food_events       -> 'food_event'
//   mood_events       -> 'mood_event'
//   water_events      -> 'water_event'
//   exercise_events   -> 'exercise_event'
// Cross-app reads (read-only): Pantry recipes (migrated) for meal logging, and
// Fitness workouts (records, empty until Fitness is ported) for the day view.

import * as db from '../../../lib/data'
import { localDayBounds } from '../constants'

const APP = 'journal'

export const TYPES = {
  cycleDay: 'cycle_day',
  periodStart: 'period_start',
  symptom: 'symptom_event',
  food: 'food_event',
  mood: 'mood_event',
  water: 'water_event',
  exercise: 'exercise_event',
}

// ── Period starts ─────────────────────────────────────────────────────────────
export async function loadPeriodStarts() {
  const rows = await db.list({ app: APP, type: TYPES.periodStart })
  return rows.map((r) => r.data.start_date).filter(Boolean).sort()
}
export async function addPeriodStart(startDate) {
  const rows = await db.list({ app: APP, type: TYPES.periodStart })
  if (rows.some((r) => r.data.start_date === startDate)) return
  await db.create({ app: APP, type: TYPES.periodStart, occurredAt: `${startDate}T12:00:00Z`, data: { start_date: startDate } })
}
export async function removePeriodStart(startDate) {
  const rows = await db.list({ app: APP, type: TYPES.periodStart })
  await Promise.all(rows.filter((r) => r.data.start_date === startDate).map((r) => db.remove(r.id)))
}

// ── Cycle days (one record per calendar date) ─────────────────────────────────
function cycleDayFrom(rec) { return rec ? { recordId: rec.id, ...rec.data } : null }

export async function getCycleDay(dateStr) {
  const rows = await db.list({ app: APP, type: TYPES.cycleDay })
  const rec = rows.find((r) => r.data.date === dateStr)
  return cycleDayFrom(rec) || { recordId: null, date: dateStr, flow: 'none', cycle_phase: null, cycle_phase_override: null, sleep_hours: null, notes: '' }
}

// Load many cycle days at once (calendar/trends) keyed by date.
export async function listCycleDays() {
  const rows = await db.list({ app: APP, type: TYPES.cycleDay })
  const map = {}
  rows.forEach((r) => { if (r.data.date) map[r.data.date] = { recordId: r.id, ...r.data } })
  return map
}

export async function saveCycleDay(dateStr, patch) {
  const rows = await db.list({ app: APP, type: TYPES.cycleDay })
  const rec = rows.find((r) => r.data.date === dateStr)
  const next = { date: dateStr, ...(rec?.data || {}), ...patch }
  if (rec) await db.update(rec.id, { data: next })
  else await db.create({ app: APP, type: TYPES.cycleDay, occurredAt: `${dateStr}T12:00:00Z`, data: next })
}

// ── Events (symptom/food/mood/water/exercise) ─────────────────────────────────
const eventFrom = (r) => ({ id: r.id, occurred_at: r.occurredAt, ...r.data })

// Events for a single local calendar day (uses localDayBounds → UTC range).
export async function listEventsForDay(type, dateStr) {
  const { startISO, endISO } = localDayBounds(dateStr)
  const rows = await db.list({ app: APP, type, from: startISO, to: endISO })
  return rows.map(eventFrom).sort((a, b) => new Date(a.occurred_at) - new Date(b.occurred_at))
}

// Events across an arbitrary UTC range (trends windows).
export async function listEventsInRange(type, fromISO, toISO) {
  const rows = await db.list({ app: APP, type, from: fromISO, to: toISO })
  return rows.map(eventFrom)
}

export async function addEvent(type, occurredAtISO, payload) {
  const rec = await db.create({ app: APP, type, occurredAt: occurredAtISO, data: payload })
  return eventFrom(rec)
}
export async function updateEvent(id, occurredAtISO, payload) {
  const rec = await db.update(id, { data: payload, occurredAt: occurredAtISO })
  return eventFrom(rec)
}
export async function deleteEvent(id) { await db.remove(id) }

// ── Cross-app (read-only) ─────────────────────────────────────────────────────
// Pantry recipes (migrated to records) — for "log a meal" food entry.
export async function listRecipes() {
  try {
    const rows = await db.list({ app: 'pantry', type: 'recipe' })
    return rows.map((r) => ({ id: r.id, name: r.data.name, category: r.data.category, ingredients: r.data.ingredients || [] }))
      .sort((a, b) => a.name.localeCompare(b.name))
  } catch { return [] }
}
// Fitness workouts for a day — empty until the Fitness app is ported to records.
export async function listWorkoutsForDay(dateStr) {
  try {
    const { startISO, endISO } = localDayBounds(dateStr)
    const rows = await db.list({ app: 'fitness', type: 'workout', from: startISO, to: endISO })
    return rows.map((r) => ({ id: r.id, occurred_at: r.occurredAt, ...r.data }))
  } catch { return [] }
}
