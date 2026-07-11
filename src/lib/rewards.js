// Shared rewards economy — profiles, leveling, rewards shop, redemptions, and
// the append-only reward_event log. Both Fitness and Quest write here so XP
// accumulates in one place regardless of source.
//
// app namespace: 'rewards'
// types: profile, reward, redemption, reward_event

import * as db from './data'
import { members } from './identity'
import { todayStr, addDays } from './time'

// ── Leveling (canonical copy; quest/constants.js re-exports these) ────────────
export function xpForLevel(level) {
  return Math.round(50 * (level - 1) + 25 * (level - 1) * (level - 1))
}
export function levelFromXp(totalXp) {
  let level = 1
  while (xpForLevel(level + 1) <= totalXp) level++
  return level
}
export function levelProgress(totalXp) {
  const level = levelFromXp(totalXp)
  const floor = xpForLevel(level)
  const ceil  = xpForLevel(level + 1)
  const into  = totalXp - floor
  const span  = ceil - floor
  return { level, into, span, pct: Math.max(0, Math.min(1, into / span)) }
}
export const RANK_TITLES = [
  { min: 1,  title: 'Commoner'   },
  { min: 5,  title: 'Squire'     },
  { min: 10, title: 'Adventurer' },
  { min: 18, title: 'Knight'     },
  { min: 28, title: 'Champion'   },
  { min: 40, title: 'Hero'       },
  { min: 55, title: 'Archmage'   },
  { min: 75, title: 'Legend'     },
]
export function rankTitle(level) {
  let t = RANK_TITLES[0].title
  for (const r of RANK_TITLES) if (level >= r.min) t = r.title
  return t
}

// ── Streak helpers (same values as fitness/constants.js) ──────────────────────
const BASE_TOKENS = 10
const STREAK_TOKEN_MILESTONES = { 3: 10, 7: 25, 14: 50, 30: 100 }

function nextStreakState({ lastActiveDate, currentStreak, longestStreak }, today) {
  if (lastActiveDate === today) {
    return { current: currentStreak || 1, longest: Math.max(longestStreak || 0, currentStreak || 1), changed: false }
  }
  const yesterday = addDays(today, -1)
  let current
  if (lastActiveDate === yesterday) current = (currentStreak || 0) + 1
  else current = 1
  return { current, longest: Math.max(longestStreak || 0, current), changed: true }
}

const APP = 'rewards'

// ── Profile (one per person) ──────────────────────────────────────────────────
const profileFrom = (r) => ({ recordId: r.id, ...r.data })

export async function loadProfiles() {
  const rows = await db.list({ app: APP, type: 'profile' })
  const map = {}
  rows.forEach((r) => { map[r.data.person] = profileFrom(r) })
  return map
}

export async function ensureProfiles(people) {
  const rows = await db.list({ app: APP, type: 'profile' })
  const have = new Set(rows.map((r) => r.data.person))
  const missing = people.filter((p) => !have.has(p.id))
  for (const p of missing) {
    await db.create({ app: APP, type: 'profile', data: {
      person: p.id, display_name: p.name, xp: 0, level: 1, tokens: 0,
      current_streak: 0, longest_streak: 0, last_active_date: null,
    } })
  }
  return missing.length > 0
}

export async function getProfile(person) {
  const rows = await db.list({ app: APP, type: 'profile' })
  const r = rows.find((x) => x.data.person === person)
  return r ? profileFrom(r) : null
}

export async function updateProfile(person, patch) {
  const rows = await db.list({ app: APP, type: 'profile' })
  const r = rows.find((x) => x.data.person === person)
  if (!r) return
  await db.update(r.id, { data: { ...r.data, ...patch } })
}

// ── Rewards shop ──────────────────────────────────────────────────────────────
const rewardFrom = (r) => ({ id: r.id, ...r.data })

export async function listRewards(person) {
  const rows = await db.list({ app: APP, type: 'reward' })
  return rows.map(rewardFrom).filter((r) => r.person === person).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
}

export async function addReward(person, data) {
  await db.create({ app: APP, type: 'reward', data: { person, ...data } })
}

export async function updateReward(id, patch) {
  const rows = await db.list({ app: APP, type: 'reward' })
  const r = rows.find((x) => x.id === id)
  await db.update(id, { data: { ...(r?.data || {}), ...patch } })
}

export async function deleteReward(id) { await db.remove(id) }

// ── Redemptions ───────────────────────────────────────────────────────────────
export async function listRedemptions(person, { limit = 30 } = {}) {
  const rows = await db.list({ app: APP, type: 'redemption' })
  return rows.map((r) => ({ id: r.id, redeemed_at: r.occurredAt, ...r.data }))
    .filter((x) => x.person === person)
    .sort((a, b) => new Date(b.redeemed_at) - new Date(a.redeemed_at))
    .slice(0, limit)
}

export async function addRedemption(person, data) {
  const redeemed_at = new Date().toISOString()
  await db.create({ app: APP, type: 'redemption', occurredAt: redeemed_at, data: { person, redeemed_at, ...data } })
}

// ── Reward events (append-only XP log) ───────────────────────────────────────
// source: 'quest' | 'fitness'
// source_id: the quest/workout id that generated the pts
export async function addRewardEvent(person, { source, source_id, pts, label }) {
  await db.create({
    app: APP, type: 'reward_event',
    occurredAt: new Date().toISOString(),
    data: { person, source, source_id: source_id ?? null, pts, label: label ?? null },
  })
}

export async function listRewardEvents(person, { limit = 50 } = {}) {
  const rows = await db.list({ app: APP, type: 'reward_event' })
  return rows
    .filter((r) => r.data.person === person || r.data.person === 'household')
    .sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt))
    .slice(0, limit)
}

// ── awardXp — single path for all per-person XP grants ───────────────────────
// Both Fitness and Quest call this so numbers stay identical.
// Returns { profile, tokenGain, leveledUp, newLevel, streak, milestone }.
export async function awardXp(person, { pts, source, source_id, label }) {
  await ensureProfiles(members())
  const p = await getProfile(person)
  if (!p) return null

  const today = todayStr()
  const streak = nextStreakState(
    { lastActiveDate: p.last_active_date, currentStreak: p.current_streak, longestStreak: p.longest_streak },
    today,
  )

  let tokenGain = BASE_TOKENS
  let milestone = null
  if (streak.changed && STREAK_TOKEN_MILESTONES[streak.current]) {
    milestone = STREAK_TOKEN_MILESTONES[streak.current]
    tokenGain += milestone
  }

  const newXp    = p.xp + pts
  const newLevel = levelFromXp(newXp)
  const leveledUp = newLevel > p.level

  await updateProfile(person, {
    xp: newXp,
    level: newLevel,
    tokens: p.tokens + tokenGain,
    current_streak: streak.current,
    longest_streak: streak.longest,
    last_active_date: today,
  })
  await addRewardEvent(person, { source, source_id: source_id ?? null, pts, label: label ?? null })

  const profile = await getProfile(person)
  return { profile, tokenGain, leveledUp, newLevel, streak: streak.current, milestone }
}
