// Mav's Quest Log data layer on grove.records.
//   game_state -> 'game_state' (single record; total_xp, earned_badges, claimed_challenges)
//   habit_completions -> 'habit_completion' (payload {date, habit_id})
//   mood/food/water/exercise/sleep_events -> '<x>_event' (occurred_at + payload)
// Cross-app (read-only): Pantry recipes for meal logging, Fitness workouts (Mav's).

import * as db from '../../../lib/data'
import { localDayBounds } from '../constants'

const APP = 'quest'
export const TYPES = {
  gameState: 'game_state', habit: 'habit_completion',
  mood: 'mood_event', food: 'food_event', water: 'water_event',
  exercise: 'exercise_event', sleep: 'sleep_event',
}

// ── Game state (single record) ────────────────────────────────────────────────
export async function getGameState() {
  const rows = await db.list({ app: APP, type: TYPES.gameState })
  const r = rows[0]
  return r ? { recordId: r.id, ...r.data } : null
}
export async function ensureGameState() {
  const existing = await getGameState()
  if (existing) return existing
  const rec = await db.create({ app: APP, type: TYPES.gameState, data: { id: 'current', total_xp: 0, earned_badges: [], claimed_challenges: [] } })
  return { recordId: rec.id, ...rec.data }
}
export async function updateGameState(patch) {
  const rows = await db.list({ app: APP, type: TYPES.gameState })
  const r = rows[0]
  if (!r) return
  await db.update(r.id, { data: { ...r.data, ...patch } })
}

// ── Habit completions ─────────────────────────────────────────────────────────
export async function listHabitCompletions() {
  const rows = await db.list({ app: APP, type: TYPES.habit })
  return rows.map((r) => ({ date: r.data.date, habit_id: r.data.habit_id }))
}
export async function addHabitCompletion(date, habitId) {
  const rows = await db.list({ app: APP, type: TYPES.habit })
  if (rows.some((r) => r.data.date === date && r.data.habit_id === habitId)) return
  await db.create({ app: APP, type: TYPES.habit, occurredAt: `${date}T12:00:00Z`, data: { date, habit_id: habitId } })
}
export async function removeHabitCompletion(date, habitId) {
  const rows = await db.list({ app: APP, type: TYPES.habit })
  await Promise.all(rows.filter((r) => r.data.date === date && r.data.habit_id === habitId).map((r) => db.remove(r.id)))
}

export async function countWorkouts() {
  const rows = await db.list({ app: APP, type: TYPES.exercise })
  return rows.length
}

// ── Events ────────────────────────────────────────────────────────────────────
const eventFrom = (r) => ({ id: r.id, occurred_at: r.occurredAt, ...r.data })
export async function listEventsForDay(type, dateStr) {
  const { startISO, endISO } = localDayBounds(dateStr)
  const rows = await db.list({ app: APP, type, from: startISO, to: endISO })
  return rows.map(eventFrom)
}
export async function listEventsInRange(type, fromISO, toISO) {
  const rows = await db.list({ app: APP, type, from: fromISO, to: toISO })
  return rows.map(eventFrom)
}
export async function addEvent(type, occurredAtISO, payload) {
  const rec = await db.create({ app: APP, type, occurredAt: occurredAtISO, data: payload })
  return eventFrom(rec)
}
export async function deleteEvent(id) { await db.remove(id) }
export async function updateEvent(id, occurredAtISO, payload) {
  const rec = await db.update(id, { data: payload, occurredAt: occurredAtISO })
  return eventFrom(rec)
}

// ── Cross-app (read-only) ─────────────────────────────────────────────────────
export async function listRecipes() {
  try {
    const rows = await db.list({ app: 'pantry', type: 'recipe' })
    return rows.map((r) => ({ id: r.id, name: r.data.name, category: r.data.category, ingredients: r.data.ingredients || [] }))
      .sort((a, b) => a.name.localeCompare(b.name))
  } catch { return [] }
}
export async function listWorkoutsForDay(dateStr) {
  try {
    const { startISO, endISO } = localDayBounds(dateStr)
    const rows = await db.list({ app: 'fitness', type: 'workout', from: startISO, to: endISO })
    return rows.filter((r) => r.data.person === 'mav').map((r) => ({ id: r.id, occurred_at: r.occurredAt, ...r.data }))
  } catch { return [] }
}
