// Shared rewards economy — profiles, rewards shop, redemptions, and the
// append-only reward_event log. Both Fitness and Quest write here so XP
// accumulates in one place regardless of source.
//
// app namespace: 'rewards'
// types: profile, reward, redemption, reward_event

import * as db from './data'

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
