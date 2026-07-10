// Reps (fitness) data layer on grove.records. Profile, reward, and redemption
// records now live in the shared 'rewards' namespace (src/lib/rewards.js).
// This file re-exports those functions for backward compat and owns only the
// fitness-specific types: exercise, workout, workout_exercise.

import * as db from '../../../lib/data'
export {
  loadProfiles, ensureProfiles, getProfile, updateProfile,
  listRewards, addReward, updateReward, deleteReward,
  listRedemptions, addRedemption,
} from '../../../lib/rewards'

const APP = 'fitness'
export const TYPES = {
  exercise: 'exercise', workout: 'workout', workoutExercise: 'workout_exercise',
}
const rowFrom = (r) => ({ id: r.id, ...r.data })

// ── Exercise library (global presets + this person's customs) ─────────────────
export async function listExercises(person) {
  const rows = await db.list({ app: APP, type: TYPES.exercise })
  return rows.map(rowFrom)
    .filter((e) => e.person == null || e.person === person)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
}

// ── Workouts (+ their exercise rows) ──────────────────────────────────────────
export async function addWorkout(person, data) {
  const performed_at = new Date().toISOString()
  const rec = await db.create({ app: APP, type: TYPES.workout, occurredAt: performed_at, data: { person, performed_at, ...data } })
  return { id: rec.id }
}
export async function addWorkoutExercises(exRows) {
  await Promise.all(exRows.map((e) => db.create({ app: APP, type: TYPES.workoutExercise, data: e })))
}
export async function listWorkouts(person, { limit = 80 } = {}) {
  const [ws, exs] = await Promise.all([
    db.list({ app: APP, type: TYPES.workout }),
    db.list({ app: APP, type: TYPES.workoutExercise }),
  ])
  const byWorkout = {}
  exs.forEach((e) => { (byWorkout[e.data.workout_id] ||= []).push({ id: e.id, ...e.data }) })
  return ws
    .map((w) => ({ id: w.id, performed_at: w.occurredAt, ...w.data, workout_exercises: (byWorkout[w.id] || []).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)) }))
    .filter((w) => w.person === person)
    .sort((a, b) => new Date(b.performed_at) - new Date(a.performed_at))
    .slice(0, limit)
}
export async function deleteWorkout(id) {
  const exs = await db.list({ app: APP, type: TYPES.workoutExercise })
  await Promise.all(exs.filter((e) => e.data.workout_id === id).map((e) => db.remove(e.id)))
  await db.remove(id)
}

// ── Rewards shop + redemptions ────────────────────────────────────────────────
export async function listRewards(person) {
  const rows = await db.list({ app: APP, type: TYPES.reward })
  return rows.map(rowFrom).filter((r) => r.person === person).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
}
export async function addReward(person, data) {
  await db.create({ app: APP, type: TYPES.reward, data: { person, ...data } })
}
export async function updateReward(id, patch) {
  const rows = await db.list({ app: APP, type: TYPES.reward })
  const r = rows.find((x) => x.id === id)
  await db.update(id, { data: { ...(r?.data || {}), ...patch } })
}
export async function deleteReward(id) { await db.remove(id) }

export async function listRedemptions(person, { limit = 30 } = {}) {
  const rows = await db.list({ app: APP, type: TYPES.redemption })
  return rows.map((r) => ({ id: r.id, redeemed_at: r.occurredAt, ...r.data }))
    .filter((x) => x.person === person)
    .sort((a, b) => new Date(b.redeemed_at) - new Date(a.redeemed_at))
    .slice(0, limit)
}
export async function addRedemption(person, data) {
  const redeemed_at = new Date().toISOString()
  await db.create({ app: APP, type: TYPES.redemption, occurredAt: redeemed_at, data: { person, redeemed_at, ...data } })
}
